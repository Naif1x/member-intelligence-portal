'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Chip, Input, Switch } from '@heroui/react';
import { useApp } from '@/lib/store';

interface AgentConfig {
  enabled: boolean;
  agentId: string;
  myDomain: string;
  hasSecrets: boolean;
  lastTestOk?: boolean;
}

type ConnectionStatus = 'not_configured' | 'disconnected' | 'connected' | 'testing';

const STATUS_META: Record<ConnectionStatus, { label: string; color: 'success' | 'warning' | 'default' }> = {
  connected: { label: 'Connected', color: 'success' },
  disconnected: { label: 'Disconnected', color: 'warning' },
  not_configured: { label: 'Not Configured', color: 'default' },
  testing: { label: 'Testing…', color: 'default' },
};

function deriveStatus(cfg: AgentConfig, testingNow: boolean): ConnectionStatus {
  if (testingNow) return 'testing';
  if (!cfg.hasSecrets || !cfg.agentId || !cfg.myDomain) return 'not_configured';
  if (!cfg.enabled) return 'disconnected';
  return cfg.lastTestOk ? 'connected' : 'disconnected';
}

// Shows only the first/last few characters — enough to recognize the value
// at a glance without displaying it in full, matching how Salesforce Setup
// itself masks consumer keys/IDs in its UI.
function maskId(id: string): string {
  if (id.length <= 8) return '•'.repeat(id.length);
  return `${id.slice(0, 4)}${'•'.repeat(Math.max(6, id.length - 8))}${id.slice(-4)}`;
}

const SUBTABS = [{ id: 'integration', label: 'Integration', icon: '🔌' }] as const;

export default function Settings() {
  const { refreshAgentConfig } = useApp();
  const [subtab, setSubtab] = useState<(typeof SUBTABS)[number]['id']>('integration');
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [editing, setEditing] = useState(false);
  const [agentId, setAgentId] = useState('');
  const [myDomain, setMyDomain] = useState('');
  const [revealAgentId, setRevealAgentId] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);

  function load() {
    fetch('/api/agent/config')
      .then((r) => r.json())
      .then((cfg: AgentConfig) => {
        setConfig(cfg);
        setAgentId(cfg.agentId);
        setMyDomain(cfg.myDomain);
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function handleToggle(enabled: boolean) {
    if (!config) return;
    setConfig({ ...config, enabled });
    const res = await fetch('/api/agent/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    const updated: AgentConfig = await res.json();
    setConfig(updated);
    refreshAgentConfig();
  }

  function startEditing() {
    if (!config) return;
    setAgentId(config.agentId);
    setMyDomain(config.myDomain);
    setRevealAgentId(false);
    setEditing(true);
  }

  function cancelEditing() {
    if (!config) return;
    setAgentId(config.agentId);
    setMyDomain(config.myDomain);
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/agent/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, myDomain }),
      });
      if (!res.ok) throw new Error();
      const updated: AgentConfig = await res.json();
      setConfig(updated);
      setTestResult(null);
      setSaveMessage('Saved');
      refreshAgentConfig();
      // Confirm briefly, then return to the read-only view — the pattern
      // you'd expect from a real settings page.
      setTimeout(() => {
        setSaveMessage(null);
        setEditing(false);
      }, 900);
    } catch {
      setSaveMessage('Failed to save. Try again.');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/agent/test', { method: 'POST' });
      const result = await res.json();
      setTestResult(result);
      setConfig((c) => (c ? { ...c, lastTestOk: result.ok } : c));
    } catch {
      setTestResult({ ok: false, error: 'Network error while testing the connection.' });
    } finally {
      setTesting(false);
    }
  }

  if (!config) return null;

  const status = deriveStatus(config, testing);

  return (
    <div className="flex gap-6 items-start">
      {/* Sub-navigation */}
      <div className="w-44 flex-shrink-0">
        <div className="text-xs font-bold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--sf-text-secondary)' }}>
          Settings
        </div>
        <nav className="flex flex-col gap-0.5">
          {SUBTABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSubtab(tab.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors"
              style={
                subtab === tab.id
                  ? { background: 'var(--sf-hover)', color: 'var(--sf-accent-dark)', fontWeight: 600 }
                  : { color: 'var(--sf-text)' }
              }
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl">
        {subtab === 'integration' && (
          <Card>
            <Card.Header className="flex flex-row items-center justify-between gap-3 pb-0">
              <div>
                <Card.Title className="text-sm font-bold" style={{ color: 'var(--sf-primary)' }}>
                  Agentforce Integration
                </Card.Title>
                <Card.Description className="text-xs" style={{ color: 'var(--sf-text-secondary)' }}>
                  Connects the chat assistant to your Salesforce Agentforce agent
                </Card.Description>
              </div>
              <Chip size="sm" color={STATUS_META[status].color} variant="soft">
                {STATUS_META[status].label}
              </Chip>
            </Card.Header>

            <Card.Content className="pt-4 flex flex-col gap-5">
              {/* Enable toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--sf-text)' }}>Enable Integration</div>
                  <div className="text-xs" style={{ color: 'var(--sf-text-secondary)' }}>
                    When off, the chat box shows a disabled state and won&apos;t call Salesforce
                  </div>
                </div>
                <Switch isSelected={config.enabled} onChange={handleToggle}>
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
              </div>

              <div className="h-px" style={{ background: 'var(--sf-border)' }} />

              {!editing ? (
                <>
                  {/* Read-only view */}
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--sf-text-secondary)' }}>
                      Agent ID
                    </div>
                    <div className="text-sm font-mono flex items-center gap-2" style={{ color: 'var(--sf-text)' }}>
                      {config.agentId ? maskId(config.agentId) : <span style={{ color: 'var(--sf-text-secondary)' }}>Not set</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--sf-text-secondary)' }}>
                      My Domain URL
                    </div>
                    <div className="text-sm" style={{ color: 'var(--sf-text)' }}>
                      {config.myDomain || <span style={{ color: 'var(--sf-text-secondary)' }}>Not set</span>}
                    </div>
                  </div>
                  <div>
                    <Button variant="outline" onPress={startEditing}>Edit</Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Edit mode */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--sf-text-secondary)' }}>
                      Agent ID
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type={revealAgentId ? 'text' : 'password'}
                        value={agentId}
                        onChange={(e) => setAgentId(e.target.value)}
                        placeholder="0Xxxxxxxxxxxxxxxxx"
                        fullWidth
                      />
                      <Button
                        isIconOnly
                        variant="ghost"
                        size="sm"
                        aria-label={revealAgentId ? 'Hide Agent ID' : 'Show Agent ID'}
                        onPress={() => setRevealAgentId((v) => !v)}
                      >
                        {revealAgentId ? '🙈' : '👁️'}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--sf-text-secondary)' }}>
                      My Domain URL
                    </label>
                    <Input
                      value={myDomain}
                      onChange={(e) => setMyDomain(e.target.value)}
                      placeholder="https://your-domain.my.salesforce.com"
                      fullWidth
                    />
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      onPress={handleSave}
                      isDisabled={saving}
                      className="text-white"
                      style={{ background: 'var(--sf-primary)' }}
                    >
                      {saving ? 'Saving…' : 'Save Changes'}
                    </Button>
                    <Button variant="ghost" onPress={cancelEditing} isDisabled={saving}>
                      Cancel
                    </Button>
                    {saveMessage && (
                      <span className="text-xs font-medium" style={{ color: 'var(--sf-success)' }}>
                        {saveMessage === 'Saved' ? '✓ Saved' : saveMessage}
                      </span>
                    )}
                  </div>
                </>
              )}

              <div className="h-px" style={{ background: 'var(--sf-border)' }} />

              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant="outline"
                  onPress={handleTest}
                  isDisabled={testing}
                >
                  {testing ? 'Testing…' : 'Test Connection'}
                </Button>
              </div>

              {testResult && (
                <div
                  className="text-sm px-3 py-2 rounded-lg"
                  style={
                    testResult.ok
                      ? { background: '#E8F5E9', color: 'var(--sf-success)' }
                      : { background: '#FFF3E0', color: 'var(--sf-warning)' }
                  }
                >
                  {testResult.ok
                    ? '✓ Connection successful — token minted and session started.'
                    : `✗ ${testResult.error || 'Connection failed.'}`}
                </div>
              )}

              {!config.hasSecrets && (
                <div className="text-xs px-3 py-2 rounded-lg" style={{ background: '#FFF3E0', color: 'var(--sf-warning)' }}>
                  SF_CONSUMER_KEY / SF_CONSUMER_SECRET are not set on the server. Add them to your environment
                  (never entered here) before testing the connection.
                </div>
              )}
            </Card.Content>
          </Card>
        )}
      </div>
    </div>
  );
}

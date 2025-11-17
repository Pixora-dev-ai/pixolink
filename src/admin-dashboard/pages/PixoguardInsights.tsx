import React from 'react';
import { usePixoguardReport } from '../../hooks/usePixoguardReport';

const statusColorMap: Record<string, string> = {
  ok: 'text-green-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
  skipped: 'text-slate-400'
};

const PixoguardInsights: React.FC = () => {
  const { data, loading, error } = usePixoguardReport();

  if (loading) {
    return <div className="p-6 text-white">Loading Pixoguard insights...</div>;
  }

  if (error || !data) {
    return (
      <div className="p-6 text-red-400">
        Unable to load Pixoguard report. {error ? `Reason: ${error}` : 'Run `pixoguard scan` to generate one.'}
      </div>
    );
  }

  return (
    <div className="p-6 text-white space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Pixoguard Insights</h1>
        <p className="text-sm text-slate-300">
          Last run: {data.generatedAt ? new Date(data.generatedAt).toLocaleString() : 'Unknown'}
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InsightCard label="Total Findings" value={data.summary?.totalFindings ?? 0} />
        <InsightCard label="Errors" value={data.summary?.errors ?? 0} tone="error" />
        <InsightCard label="Warnings" value={data.summary?.warnings ?? 0} tone="warn" />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Actionable Findings</h2>
        <div className="space-y-3">
          {(data.findings ?? []).length === 0 && (
            <div className="text-slate-400">No findings yet. Run a new audit to populate this feed.</div>
          )}
          {(data.findings ?? []).map((finding, index) => (
            <div key={`${finding.message}-${index}`} className="border border-slate-700 rounded-lg p-4">
              <p className={`font-medium capitalize ${statusColorMap[finding.status] ?? 'text-white'}`}>
                {finding.status}
              </p>
              <p className="mt-1">{finding.message}</p>
              {finding.detail && <p className="text-sm text-slate-300 mt-1">{finding.detail}</p>}
              {finding.suggestedFix && (
                <p className="text-sm text-emerald-300 mt-2">Suggested fix: {finding.suggestedFix}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Connector Signals</h2>
        <div className="space-y-3">
          {(data.connectors ?? []).length === 0 && (
            <div className="text-slate-400">No connector data yet. Configure MCP tokens to enrich this view.</div>
          )}
          {(data.connectors ?? []).map((connector) => (
            <div key={connector.name} className="border border-slate-700 rounded-lg p-4">
              <p className={`font-medium ${statusColorMap[connector.status] ?? 'text-white'}`}>
                {connector.name} — {connector.summary}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {(connector.details ?? []).map((detail, idx) => (
                  <li key={`${connector.name}-${idx}`}>• {detail}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

type InsightCardProps = {
  label: string;
  value: number;
  tone?: 'ok' | 'warn' | 'error';
};

const toneClasses: Record<string, string> = {
  ok: 'text-green-400',
  warn: 'text-yellow-400',
  error: 'text-red-400'
};

const InsightCard: React.FC<InsightCardProps> = ({ label, value, tone }) => {
  return (
    <div className="border border-slate-700 rounded-lg p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`text-3xl font-semibold ${tone ? toneClasses[tone] : 'text-white'}`}>{value}</p>
    </div>
  );
};

export default PixoguardInsights;

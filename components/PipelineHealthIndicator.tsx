import React from 'react';

export type StageState = 'idle' | 'connecting' | 'connected' | 'error' | 'reconnecting';

export interface PipelineHealthProps {
  sttState: StageState;
  translateState: StageState;
  ttsState: StageState;
  droppedFrames?: number;
}

const stateColor: Record<StageState, string> = {
  idle: 'var(--text-muted)',
  connecting: '#e0b44c',
  connected: 'var(--matcha-500)',
  error: 'var(--terra-500)',
  reconnecting: '#e0b44c',
};

const stateLabel: Record<StageState, string> = {
  idle: 'Idle',
  connecting: 'Connecting',
  connected: 'OK',
  error: 'Error',
  reconnecting: 'Reconnecting',
};

const PipelineHealthIndicator: React.FC<PipelineHealthProps> = ({
  sttState,
  translateState,
  ttsState,
  droppedFrames = 0,
}) => {
  const stages: Array<{ label: string; state: StageState }> = [
    { label: 'STT', state: sttState },
    { label: 'Translate', state: translateState },
    { label: 'TTS', state: ttsState },
  ];

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl mt-3"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-soft)' }}
    >
      {stages.map((stage, i) => (
        <React.Fragment key={stage.label}>
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{
                background: stateColor[stage.state],
                boxShadow: stage.state === 'connected' ? `0 0 6px ${stateColor[stage.state]}` : 'none',
                animation: stage.state === 'connecting' || stage.state === 'reconnecting'
                  ? 'pulse 1.5s ease-in-out infinite' : 'none',
              }}
            />
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {stage.label}
            </span>
            <span
              className="text-xs"
              style={{ color: stateColor[stage.state] }}
            >
              {stateLabel[stage.state]}
            </span>
          </div>
          {i < stages.length - 1 && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>→</span>
          )}
        </React.Fragment>
      ))}
      {droppedFrames > 0 && (
        <span
          className="text-xs font-medium ml-auto px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(224, 123, 76, 0.15)', color: 'var(--terra-500)' }}
        >
          {droppedFrames} dropped
        </span>
      )}
    </div>
  );
};

export default PipelineHealthIndicator;

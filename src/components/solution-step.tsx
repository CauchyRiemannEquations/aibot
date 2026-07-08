import { MarkdownViewer } from '@/components/markdown-viewer';

type SolutionStepProps = {
  number: number;
  title: string;
  content: string;
  defaultOpen?: boolean;
  tone?: 'default' | 'answer' | 'tip';
};

export function SolutionStep({
  number,
  title,
  content,
  defaultOpen = false,
  tone = 'default',
}: SolutionStepProps) {
  return (
    <details className={`solution-step solution-step-${tone}`} open={defaultOpen}>
      <summary className="solution-step-summary">
        <span className="solution-step-number">{number}</span>
        <span className="solution-step-title">{title}</span>
        <span className="solution-step-chevron" aria-hidden="true">
          v
        </span>
      </summary>
      <div className="solution-step-body">
        <MarkdownViewer content={content} />
      </div>
    </details>
  );
}

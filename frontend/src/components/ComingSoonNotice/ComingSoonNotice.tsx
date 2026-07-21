interface ComingSoonNoticeProps {
  message: string;
}

export function ComingSoonNotice({ message }: ComingSoonNoticeProps): JSX.Element {
  return (
    <div className="rounded border border-ink-100 p-8 text-center">
      <p className="text-ink-500">{message}</p>
    </div>
  );
}

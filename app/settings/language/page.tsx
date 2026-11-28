import Screen from "@/components/Screen";
import Icon from "@/components/Icon";

export default function LanguagePage() {
  return (
    <Screen icon="language" title="Language" subtitle="The app speaks plain English: short words a driver reads at a glance.">
      <div className="flex min-h-16 items-center justify-between rounded-2xl border-2 border-green bg-mint p-4">
        <b>English</b>
        <span className="flex items-center gap-1 font-semibold text-green-dark">
          <Icon name="check" className="h-5 w-5" /> Selected
        </span>
      </div>
      <div className="flex min-h-16 items-center justify-between rounded-2xl border border-ink/10 p-4 text-muted">
        <b>हिन्दी (Hindi)</b>
        <span className="text-sm">Coming next</span>
      </div>
    </Screen>
  );
}

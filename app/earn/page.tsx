import Screen, { MenuRow } from "@/components/Screen";

export default function EarnPage() {
  return (
    <Screen icon="coin" title="Earn" subtitle="Contribute to the community and earn rewards.">
      <MenuRow icon="gift" title="My Rewards" subtitle="View your earned rewards." href="/earn/rewards" />
      <MenuRow icon="chart" title="Contribution History" subtitle="Your activities and points." href="/earn/history" />
      <MenuRow icon="star" title="How to Earn" subtitle="Learn ways to earn." href="/earn/how" />
    </Screen>
  );
}

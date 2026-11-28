import Screen, { MenuRow } from "@/components/Screen";

export default function RoutesPage() {
  return (
    <Screen icon="route" title="Routers" subtitle="Plan, create and manage your travel routes.">
      <MenuRow icon="plus" title="Create Route" subtitle="Plan a new route." href="/?plan" />
      <MenuRow icon="map" title="My Routes" subtitle="View saved routes." href="/routes/mine" />
      <MenuRow icon="car" title="My Vehicles" subtitle="Mileage and fuel price for trip cost." href="/vehicles" />
    </Screen>
  );
}

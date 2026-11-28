import ContributionForm from "@/components/ContributionForm";

export default function FixMapPage() {
  return (
    <ContributionForm
      config={{
        kind: "fix",
        icon: "fix",
        title: "Fix Map",
        subtitle: "Help us improve the map by reporting an issue or updating incorrect information.",
        categoryLabel: "What's the issue?",
        categories: ["Wrong Location", "Missing Place", "Incorrect Info", "Closed / Blocked Road", "Road Construction", "Road Issue", "Other"],
        maxPhotos: 3,
        detailsLabel: "Details of the Issue",
        detailsPlaceholder: "Tell us what's wrong (e.g., place is shifted, road is closed, wrong name)",
        detailsRequired: true,
        submit: "Submit Report",
        done: "Your map fix is sent.",
      }}
    />
  );
}

import ContributionForm from "@/components/ContributionForm";

export default function ReportHazardPage() {
  return (
    <ContributionForm
      config={{
        kind: "hazard",
        icon: "hazard",
        title: "Report Hazard",
        subtitle: "Help make travel safer by reporting hazards.",
        categoryLabel: "Hazard",
        categories: ["Landslide", "Rockfall", "Blocked Road", "Water on road", "Road Construction", "Traffic", "Other"],
        maxPhotos: 3,
        detailsLabel: "Add Details",
        detailsPlaceholder: "Describe the hazard (e.g., one lane open, big rocks on the road)",
        cameraFirst: true,
        submit: "Submit Report",
        done: "Your hazard report is live. Drivers near it are warned.",
      }}
    />
  );
}

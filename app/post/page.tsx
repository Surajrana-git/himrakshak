import ContributionForm from "@/components/ContributionForm";

export default function PostOnMapPage() {
  return (
    <ContributionForm
      config={{
        kind: "post",
        icon: "camera",
        title: "Map Camera",
        subtitle: "Share a photo, update, or useful information for travellers on the map.",
        categoryLabel: "Post Type",
        categories: ["Photo Update", "Road Condition", "Traffic", "Weather", "Landslide", "Blocked Road", "Safety Info", "Other"],
        maxPhotos: 5,
        detailsLabel: "Add a Short Update",
        detailsPlaceholder: "Write a brief update (e.g., road is clear, small landslide, heavy rain)",
        detailsRequired: false,
        visibility: true,
        cameraFirst: true,
        submit: "Post Update",
        done: "Your update is on the map.",
      }}
    />
  );
}

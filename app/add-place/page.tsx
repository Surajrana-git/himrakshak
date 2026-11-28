import ContributionForm from "@/components/ContributionForm";

export default function AddPlacePage() {
  return (
    <ContributionForm
      config={{
        kind: "place",
        icon: "addPlace",
        title: "Add a Place",
        subtitle: "Help others by adding a new location on the map.",
        categoryLabel: "Category",
        categories: ["Shelter", "Hospital", "Police", "Food", "Fuel", "Rest Area", "Landmark", "Other"],
        nameField: { label: "Place Name", placeholder: "e.g., Shelter, Hospital" },
        maxPhotos: 5,
        detailsLabel: "Description",
        detailsPlaceholder: "Write a short description (e.g., road condition, facilities, timing)",
        submit: "Submit Place",
        done: "Your place is on the map.",
      }}
    />
  );
}

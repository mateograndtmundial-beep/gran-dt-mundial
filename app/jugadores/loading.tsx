import { PageTitle, SkeletonList } from "@/components/ui";

export default function Loading() {
  return (
    <>
      <PageTitle title="Jugadores" />
      <SkeletonList count={9} />
    </>
  );
}

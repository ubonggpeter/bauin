import ViewerRegisterForm from "./ViewerRegisterForm";

export default function ViewerRegisterPage({
  searchParams,
}: {
  searchParams: { ref?: string; aff?: string; score?: string };
}) {
  return (
    <ViewerRegisterForm
      initialRef={searchParams.ref ?? ""}
      affiliateCode={searchParams.aff ?? ""}
      quizScore={searchParams.score ? Number(searchParams.score) : null}
    />
  );
}

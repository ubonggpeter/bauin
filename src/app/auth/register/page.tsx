import RegisterForm from "./RegisterForm";

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { ref?: string; aff?: string };
}) {
  return (
    <RegisterForm
      initialRef={searchParams.ref ?? ""}
      affiliateCode={searchParams.aff ?? ""}
    />
  );
}

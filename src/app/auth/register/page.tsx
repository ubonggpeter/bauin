import RegisterForm from "./RegisterForm";

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { ref?: string };
}) {
  return <RegisterForm initialRef={searchParams.ref ?? ""} />;
}

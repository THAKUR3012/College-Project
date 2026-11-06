import { redirect, type LoaderFunctionArgs } from "react-router";
import { getCurrentUser } from "~/services/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getCurrentUser(request);
  if (user) {
    return redirect("/dashboard");
  }
  return redirect("/login");
}

export default function Index() {
  return null;
}

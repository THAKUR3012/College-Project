import type { LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData } from "react-router";
import { requireUser } from "~/services/auth.server";
import { AppLayout } from "~/components/layout/AppLayout";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  return { user };
}

export default function ProtectedAppLayout() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <AppLayout user={user}>
      <Outlet />
    </AppLayout>
  );
}

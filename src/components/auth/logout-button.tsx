import { logoutUser } from "@/app/actions/auth";
import { getT } from "@/lib/lang";

export async function LogoutButton({ row = false }: { row?: boolean } = {}) {
  const t = await getT();
  return (
    <form action={logoutUser}>
      <button
        type="submit"
        className={row ? "w-full px-5 py-3.5 text-left text-sm text-white hover:bg-zinc-900" : "rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-white"}
      >
        {t("Abmelden", "Log out")}
      </button>
    </form>
  );
}

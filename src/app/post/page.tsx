import { redirect } from "next/navigation";

// Phase W (Luca 17.10.): Posten (Solo-Pitch, Duell, Creator-Video, Casting)
// gibt es nur noch in der App — alte Links und Lesezeichen landen auf /app.
// Das frühere Formular steht in der Git-Geschichte (vor Phase W).
export default function PostPage() {
  redirect("/app");
}

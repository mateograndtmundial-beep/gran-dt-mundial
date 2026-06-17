import { getCurrentUser } from "@/lib/auth";
import { getChangeReminder } from "@/lib/queries";
import { ChangeReminderPopup } from "@/components/change-reminder-popup";

/**
 * Gate server-side del popup recordatorio de cierre (montado global en el
 * layout). Corta barato si no aplica: sin sesión, o `getChangeReminder` devuelve
 * `null` (fuera de la ventana de 24 h, sin equipo, o ya tocó su equipo). Solo
 * cuando aplica monta el cliente, que se encarga de mostrarlo una vez por fecha.
 */
export async function ChangeReminder() {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    user = await getCurrentUser();
  } catch {
    return null; // sin Clerk/DB → no molestamos
  }
  if (!user) return null;

  let reminder: Awaited<ReturnType<typeof getChangeReminder>> = null;
  try {
    reminder = await getChangeReminder(user.id);
  } catch {
    return null;
  }
  if (!reminder) return null;

  return (
    <ChangeReminderPopup
      roundId={reminder.roundId}
      roundName={reminder.roundName}
      deadline={reminder.deadline}
    />
  );
}

// Общая логика смены статуса заявки — её используют admin-api и telegram-webhook,
// чтобы правила («одобрить можно только если даты свободны», счётчик аренд) не расходились.

export const RENTAL_STATUSES = ["pending", "active", "completed", "cancelled", "rejected"]

export async function setRentalStatus(supabase: any, id: string, status: string) {
  if (!RENTAL_STATUSES.includes(status)) throw new Error("Неизвестный статус")

  const { data: current, error } = await supabase
    .from("rentals")
    .select("id, vehicle_id, status, start_date, end_date")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  if (!current) throw new Error("Заявка не найдена")
  if (current.status === status) return current

  // Одобрить можно, только если даты не пересекаются с другой одобренной заявкой.
  if (status === "active" && current.vehicle_id) {
    const { data: clash, error: clashError } = await supabase
      .from("rentals")
      .select("id")
      .eq("vehicle_id", current.vehicle_id)
      .eq("status", "active")
      .neq("id", id)
      .lte("start_date", current.end_date)
      .gte("end_date", current.start_date)
      .limit(1)
    if (clashError) throw clashError
    if (clash && clash.length > 0) {
      throw new Error("Эти даты уже заняты другой одобренной заявкой")
    }
  }

  const { data, error: updError } = await supabase
    .from("rentals")
    .update({ status })
    .eq("id", id)
    .select()
    .single()
  if (updError) throw updError

  // Счётчик аренд растёт при завершении и откатывается, если статус вернули.
  if (current.vehicle_id && (status === "completed" || current.status === "completed")) {
    const delta = status === "completed" ? 1 : -1
    const { data: v } = await supabase.from("vehicles").select("rents").eq("id", current.vehicle_id).maybeSingle()
    if (v) {
      await supabase
        .from("vehicles")
        .update({ rents: Math.max(0, (v.rents ?? 0) + delta) })
        .eq("id", current.vehicle_id)
    }
  }

  return data
}

export function errMsg(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as any).message)
  return String(e)
}

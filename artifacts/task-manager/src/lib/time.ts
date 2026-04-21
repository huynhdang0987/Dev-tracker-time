export function toLocalDatetimeString(date: Date): string {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function formatLocalTime(isoString: string, fmt: "HH:mm" | "MMM d, HH:mm" = "HH:mm"): string {
  const date = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const h = pad(date.getHours());
  const m = pad(date.getMinutes());
  if (fmt === "HH:mm") return `${h}:${m}`;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}, ${h}:${m}`;
}

import { notFound } from "next/navigation"

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (process.env.NODE_ENV === "production") notFound()
  return (
    <>
      <style>{`body { overflow: auto !important; }`}</style>
      <div style={{ minHeight: "100vh" }}>{children}</div>
    </>
  )
}

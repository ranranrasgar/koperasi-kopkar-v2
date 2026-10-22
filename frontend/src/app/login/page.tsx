import { redirect } from "next/navigation"
import { AuthCard, LoginForm } from "@/components/auth/AuthForms"
import { operatorSesi } from "@/lib/operator"
import { sp } from "@/lib/list"

export default async function LoginPage(props: PageProps<"/login">) {
    if (await operatorSesi()) redirect("/dashboard")
    const next = sp(await props.searchParams, "next")
    return (
        <AuthCard title="Login Operator" description="Masuk dengan nama operator koperasi.">
            <LoginForm next={next.startsWith("/dashboard") ? next : "/dashboard"} />
        </AuthCard>
    )
}

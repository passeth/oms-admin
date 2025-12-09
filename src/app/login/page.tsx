import { login, signup } from './actions'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message: string }>
}) {
    const { message } = await searchParams

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            {/* Background Decor */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-[20%] -left-[10%] h-[700px] w-[700px] rounded-full bg-purple-500/20 blur-[100px]" />
                <div className="absolute top-[40%] -right-[10%] h-[600px] w-[600px] rounded-full bg-blue-500/20 blur-[100px]" />
            </div>

            <div className="z-10 w-full max-w-md space-y-8 rounded-2xl bg-white/5 p-10 shadow-2xl backdrop-blur-xl border border-white/10">
                <div className="text-center">
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        OMS ADMIN
                    </h1>
                    <p className="mt-2 text-sm text-gray-400">
                        Order Management System
                    </p>
                </div>

                <form className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="sr-only">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="relative block w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                                placeholder="Email address"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="relative block w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                                placeholder="Password"
                            />
                        </div>
                    </div>

                    <div>
                        {message && (
                            <p className="mb-4 text-center text-sm font-medium text-red-500">
                                {message}
                            </p>
                        )}


                        <button
                            formAction={login}
                            className="group relative flex w-full justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                        >
                            Sign in
                        </button>

                        <button
                            formAction={signup}
                            className="mt-2 w-full text-xs text-gray-500 hover:text-gray-300 transition-colors"
                        >
                            Sign up
                        </button>

                    </div>
                </form>
            </div>

            <div className="mt-8 text-center text-xs text-gray-500 z-10">
                &copy; 2025 Evas Cosmetic. All rights reserved.
            </div>
        </div>
    )
}

"use client";

export function AdminLoginForm({
  email,
  password,
  loginError,
  setEmail,
  setPassword,
  handleLogin,
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <div className="w-full max-w-md p-8 border border-white/10 rounded-2xl bg-zinc-900 shadow-2xl">
        <h1 className="text-3xl mb-6 text-center font-etna tracking-wide">Admin Access</h1>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block mb-2 text-sm text-gray-400 font-glacial">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded p-3 focus:outline-none focus:border-white transition-colors"
              placeholder="admin@example.com"
              required
            />
          </div>
          <div>
            <label className="block mb-2 text-sm text-gray-400 font-glacial">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded p-3 focus:outline-none focus:border-white transition-colors"
              placeholder="********"
              required
            />
          </div>
          {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
          <button
            type="submit"
            className="w-full bg-white text-black font-etna py-3 rounded hover:bg-gray-200 transition-colors"
          >
            LOGIN
          </button>
        </form>
      </div>
    </div>
  );
}

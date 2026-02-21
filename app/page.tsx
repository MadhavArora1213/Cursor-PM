"use client";

import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/firebase/auth";
import { LogOut, LayoutDashboard, Search, Users, Settings } from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-64 fixed inset-y-0 left-0 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 hidden md:flex flex-col">
        <div className="flex items-center h-16 px-6 border-b border-zinc-200 dark:border-zinc-800">
          <span className="font-bold text-lg tracking-tight bg-linear-to-r from-zinc-900 to-zinc-500 bg-clip-text text-transparent dark:from-white dark:to-zinc-400">
            Cursor PM
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            { name: 'Dashboard', icon: LayoutDashboard, current: true },
            { name: 'Research Hub', icon: Search, current: false },
            { name: 'Team Workspace', icon: Users, current: false },
            { name: 'Settings', icon: Settings, current: false },
          ].map((item) => (
            <a
              key={item.name}
              href="#"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${item.current
                ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-white'
                }`}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </a>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                Welcome back{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}!
              </h1>
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                Here's what's happening in your product ecosystem today.
              </p>
            </div>
            {user?.photoURL && (
              <img
                src={user.photoURL}
                alt="Profile"
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm dark:border-zinc-800"
              />
            )}
          </header>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Active Experiments', value: '4', trend: '+2 this week' },
              { label: 'User Interviews', value: '12', trend: '+4 this week' },
              { label: 'Features Shipped', value: '8', trend: 'On track' }
            ].map((stat) => (
              <div key={stat.label} className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
                <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{stat.label}</div>
                <div className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-white">{stat.value}</div>
                <div className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">{stat.trend}</div>
              </div>
            ))}
          </div>

          {/* Recent Activity Placeholder */}
          <div className="rounded-2xl bg-white border border-zinc-200 shadow-sm overflow-hidden dark:bg-zinc-900 dark:border-zinc-800">
            <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-white">Recent Activity</h2>
            </div>
            <div className="p-6 text-center text-zinc-500 dark:text-zinc-400">
              Your recent product activities will appear here. Let's start by adding some user research!
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

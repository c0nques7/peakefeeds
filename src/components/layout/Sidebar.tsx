import Link from "next/link";
import { Compass, LayoutGrid, LogOut, User, Plus } from "lucide-react";

export function Sidebar() {
  return (
    <div className="h-full p-6 flex flex-col ">
       <div className="mb-8">
         <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
           PeakeFeeds
         </h1>
       </div>
       
       <nav className="flex-1 space-y-2">
          <Link href="/home" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors group">
             <Compass size={20} className="group-hover:text-indigo-400 transition-colors" /> 
             <span className="font-medium">Discover</span>
          </Link>

          <Link href="/my-feed" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors group">
             <LayoutGrid size={20} className="group-hover:text-indigo-400 transition-colors" /> 
             <span className="font-medium">My Feed</span>
          </Link>

          <Link href="/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors group">
             <User size={20} className="group-hover:text-indigo-400 transition-colors" /> 
             <span className="font-medium">Profile</span>
          </Link>
          
          {/* DESKTOP CREATE BUTTON */}
          <Link href="/channels/create" className="flex items-center gap-3 p-3 rounded-xl bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all mt-6 border border-indigo-500/20 hover:border-indigo-500">
             <Plus size={20} /> 
             <span className="font-medium">New Channel</span>
          </Link>
       </nav>

       <div className="pt-6 border-t border-white/10">
          <Link href="/api/auth/signout" className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors">
             <LogOut size={20} />
             <span className="font-medium">Sign Out</span>
          </Link>
       </div>
    </div>
  )
}
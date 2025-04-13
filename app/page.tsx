'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 shadow-sm bg-white relative z-10">
        <div className="text-2xl font-bold text-black tracking-tight">
         Yesp <span className="text-indigo-600"> Invoice</span>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-6 text-gray-600 font-medium">
          <a href="#features" className="hover:text-black">Features</a>
    
          <a href="#contact" className="hover:text-black">Contact</a>
        </div>

        <div className="hidden md:block">
          <button
            onClick={() => router.push('/login')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full text-sm font-medium transition"
          >
            Join Beta
          </button>
        </div>

        {/* Mobile Menu Icon */}
        <div className="md:hidden">
          <button onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="md:hidden px-6 py-4 bg-white border-b text-gray-700 space-y-4">
          <a href="#features" onClick={() => setMenuOpen(false)} className="block">Features</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)} className="block">Pricing</a>
          <a href="#contact" onClick={() => setMenuOpen(false)} className="block">Contact</a>
          <button
            onClick={() => {
              setMenuOpen(false);
              router.push('/login');
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full mt-2"
          >
            Join Beta
          </button>
        </div>
      )}

      {/* Hero Section */}
      <section className="flex flex-1 flex-col items-center justify-center text-center px-6 py-20 bg-gradient-to-br from-indigo-50 to-white">
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
          Simplify Your <span className="text-indigo-600">Invoicing</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mb-8">
          Create and send invoices in seconds. Track payments. Get paid faster. Built for freelancers, startups, and small businesses.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-full text-lg font-semibold transition"
        >
          Join Beta
        </button>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-16 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6 text-gray-900">Everything You Need</h2>
          <div className="grid md:grid-cols-3 gap-10 text-left mt-10">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-indigo-600">1-Min Invoice</h3>
              <p className="text-gray-600">Create and send invoices in under 60 seconds – it's that easy.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2 text-indigo-600">Real-Time Tracking</h3>
              <p className="text-gray-600">Track invoice status, payment reminders, and due dates all in one place.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2 text-indigo-600">Auto Tax + Branding</h3>
              <p className="text-gray-600">Auto tax calculation and professional templates with your logo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-50 text-center py-6 text-sm text-gray-500">
  © {new Date().getFullYear()} Yesp Corporation. All rights reserved.
</footer>

    </main>
  );
}

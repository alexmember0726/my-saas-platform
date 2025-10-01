// app/auth/register/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
    // New states for name and confirm password
    const [name, setName] = useState(''); 
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); 

    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const { register, isLoading } = useAuth(); 
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        
        // Client-side password validation
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        try {
            // Pass name to the register function
            await register(name, email, password); 
            
            // Registration successful. We redirect to login.
            setSuccess('Registration successful! Please sign in with your new account.');

            // We use a small delay for the user to see the success message
            setTimeout(() => {
                router.push('/auth/login'); // Redirect to login page
            }, 1500); 

        } catch (err) {
            setError((err as Error).message || 'Registration failed. Please try again.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <div className="p-8 bg-white shadow-md rounded-lg w-full max-w-sm">
                <h1 className="text-2xl font-bold mb-6 text-center">Create a New Account</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Display error OR success message */}
                    {success && (
                        <p className="text-sm text-green-600 bg-green-50 p-2 rounded-md font-semibold">{success}</p>
                    )}
                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">{error}</p>
                    )}
                    
                    {/* Name Field */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                            disabled={isLoading}
                        />
                    </div>
                    
                    {/* Email Field */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                            disabled={isLoading}
                        />
                    </div>
                    
                    {/* Password Field */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                            disabled={isLoading}
                        />
                    </div>
                    
                    {/* Confirm Password Field (New) */}
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                            disabled={isLoading}
                        />
                    </div>
                    
                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                        disabled={isLoading || !!success} // Disable button on loading or success
                    >
                        {isLoading ? 'Registering...' : 'Sign Up'}
                    </button>
                </form>
                <p className="mt-4 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link href="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
}
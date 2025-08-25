import React from 'react';

function TailwindTest() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 text-center">
          Tailwind Test
        </h1>
        <p className="text-gray-600 text-center mb-6">
          If you can see this styled properly, Tailwind is working!
        </p>
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
          Test Button
        </button>
      </div>
    </div>
  );
}

export default TailwindTest;

import React from "react";
import { Shield, Building2, Network } from "lucide-react";
import { Link } from "react-router-dom";

function HomePage() {
  return (
    <div className="bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-800 dark:to-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
              <span className="block">ReconGraph</span>
              <span className="block text-indigo-200">
                Visualize and Secure Your Network
              </span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-indigo-100 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Discover, analyze, and secure your attack surface with advanced
              network visualization and vulnerability assessment tools.
            </p>
            <div className="mt-10 flex justify-center gap-x-6">
              <Link
                to="/scan"
                className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50"
              >
                Get Started
              </Link>
              <Link
                to="/business"
                className="rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400"
              >
                Business Solutions
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
              Comprehensive Security Solutions
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-300">
              Choose the perfect solution for your security needs
            </p>
          </div>

          <div className="mt-20">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="pt-6">
                <div className="flow-root bg-white dark:bg-gray-700 rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-md shadow-lg">
                        <Shield className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 dark:text-white tracking-tight">
                      Individual Protection
                    </h3>
                    <p className="mt-5 text-base text-gray-500 dark:text-gray-300">
                      Perfect for personal projects and small networks. Get
                      started with basic security scanning and monitoring.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <div className="flow-root bg-white dark:bg-gray-700 rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-md shadow-lg">
                        <Building2 className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 dark:text-white tracking-tight">
                      Business Solutions
                    </h3>
                    <p className="mt-5 text-base text-gray-500 dark:text-gray-300">
                      Enterprise-grade security for organizations. Advanced
                      features and dedicated support.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <div className="flow-root bg-white dark:bg-gray-700 rounded-lg px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-md shadow-lg">
                        <Network className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 dark:text-white tracking-tight">
                      Network Visualization
                    </h3>
                    <p className="mt-5 text-base text-gray-500 dark:text-gray-300">
                      Interactive network mapping and vulnerability
                      visualization for better security insights.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;

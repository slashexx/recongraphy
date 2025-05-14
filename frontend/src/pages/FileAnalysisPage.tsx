import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  FileUp,
  AlertTriangle,
  Search,
  Download,
  Lock,
  Terminal,
  Network,
  Database,
  Shield,
  File,
  Play,
  Clock,
  X,
  ChevronRight,
  ExternalLink,
  Bot,
} from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from "react-markdown";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

interface TimelineEvent {
  id: number;
  timestamp: string;
  technique: string;
  category: string;
  riskLevel: string;
  description: string;
  mitreRef: string;
  details: {
    apis: string[];
    strings: string[];
    metadata: {
      offset: string;
      section: string;
    };
  };
}

function FileAnalysisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [geminiAnalysis, setGeminiAnalysis] = useState<string>("");
  const [isAnalyzingWithGemini, setIsAnalyzingWithGemini] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFile(file);
      startAnalysis(file);
    }
  };

  const startAnalysis = async (file: File) => {
    setIsAnalyzing(true);
    setAnalysisComplete(false);
    setResults(null);
    setErrorMessage("");
    setGeminiAnalysis("");
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/capa_analyze`,
        {
          method: "POST",
          body: formData,
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze the file");
      }

      const data = await response.json();
      console.log("Analysis results:", data);
      
      if (data.error) {
        throw new Error(data.error);
      }

      setResults(data);
      setAnalysisComplete(true);
      
      // Start Gemini analysis
      await analyzeWithGemini(data);
    } catch (error) {
      console.error("Error during file analysis:", error);
      setErrorMessage(error instanceof Error ? error.message : "An error occurred during analysis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExport = () => {
    if (!results) return;
    const jsonString = JSON.stringify(results, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "analysis_report.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [currentStep, setCurrentStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  // ...existing code...
  const [filteredTimeline, setFilteredTimeline] = useState<any[]>([]);

  useEffect(() => {
    if (results && !results.error) {
      // Transform results into timeline format
      const timeline = Object.entries(results.categories)
        .flatMap(([category, techniques]) => {
          if (Array.isArray(techniques)) {
            return techniques.map(technique => ({
              category,
              techniqueName: technique,
              description: `Found in ${category} category`,
              url: `https://attack.mitre.org/techniques/${technique}`,
              details: {
                apis: [technique],
                strings: [],
                metadata: {
                  offset: '',
                  section: ''
                }
              }
            }));
          }
          return [];
        })
        .filter((event) =>
          Object.keys(event)
            .join(" ")
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        );
      setFilteredTimeline(timeline);
    } else {
      setFilteredTimeline([]);
    }
  }, [results, searchQuery]);
  // ...existing code...

  const groupedTimeline = filteredTimeline.reduce((acc, event) => {
    const { category } = event;
    if (!acc[category]) {
      acc[category] = [];
    }
    // Remove the 'category' property from the event and add the rest as a technique
    const techniques = Object.entries(event)
      .filter(([key]) => key !== "category")
      .map(([techniqueName, url]) => ({ techniqueName, url }));

    acc[category] = [...acc[category], ...techniques];
    return acc;
  }, {});
  // ...existing code...

  // Automatically progress the steps every 2 seconds
  useEffect(() => {
    if (
      analysisComplete &&
      results &&
      !results.error &&
      currentStep < filteredTimeline.length
    ) {
      const interval = setInterval(() => {
        setCurrentStep((prevStep) => {
          if (prevStep < filteredTimeline.length - 1) {
            return prevStep + 1;
          } else {
            clearInterval(interval); // Stop the interval when the last step is reached
            return prevStep;
          }
        });
      }, 2000); // 2 seconds interval for step progression
      console.log(filteredTimeline, "hey");
      return () => clearInterval(interval); // Cleanup interval on component unmount
    } else if (results?.error) {
      setErrorMessage(results.error); // Display error message
    }
  }, [analysisComplete, results, currentStep, filteredTimeline]);

  const analyzeWithGemini = async (analysisData: any) => {
    setIsAnalyzingWithGemini(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `Analyze this file analysis report and determine if there are any malicious indicators. 
      Focus on suspicious imports, behaviors, and patterns. Provide a concise assessment with specific concerns if any.
      
      Analysis Data:
      ${JSON.stringify(analysisData, null, 2)}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      setGeminiAnalysis(text);
    } catch (error) {
      console.error("Error analyzing with Gemini:", error);
      setGeminiAnalysis("Failed to analyze with Gemini. Please try again.");
    } finally {
      setIsAnalyzingWithGemini(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white  sm:text-4xl">
          File Analysis
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          Upload files to analyze their behavior and detect malicious
          capabilities
        </p>
      </div>
      {/* File Upload Section */}
      <div className="bg-white dark:bg-zinc-900 dark:text-white  shadow sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6">
          <div className="max-w-xl mx-auto">
            <label
              htmlFor="file-upload"
              className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
            >
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <FileUp className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <span>Upload a file for analysis</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={handleFileUpload}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Executables, DLLs, or documents up to 50MB
                  </p>
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>
      Analysis Results
      {isAnalyzing && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Analyzing file...</p>
        </div>
      )}
      {analysisComplete &&
        results &&
        (results?.error ? (
          <div className="text-center text-red-600">
            <p>{errorMessage}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {/* File Summary */}
              <div className="mb-8 border-b pb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200">
                      Analysis Summary
                    </h2>
                    <div className="mt-4 grid grid-cols-2 gap-4 gap-x-16">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-200">
                          File Name
                        </p>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-200">
                          {file?.name.length > 20
                            ? `${file?.name.slice(0, 20)}....${file?.name.slice(
                                -20
                              )}`
                            : file?.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-200">
                          File Size
                        </p>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-200">
                          {file
                            ? (file.size / (1024 * 1024)).toFixed(2)
                            : "N/A"}{" "}
                          MB
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-200">
                          Type
                        </p>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-200">
                          {file?.type || "Unknown Type"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-200">
                          Analysis Date
                        </p>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-200">
                          {new Date().toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleExport}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </button>
                </div>
              </div>

              {/* Horizontal Progress Timeline */}
              <div className="my-8">
                <div className="relative flex items-center">
                  {/* Static Background Bar */}
                  <div className="absolute top-4 left-0 w-full h-1 bg-gray-200 rounded-full"></div>

                  {/* Dynamic Progress Bar */}
                  <div
                    className="absolute top-4 left-0 h-1 bg-indigo-600 rounded-full overflow-y-hidden overflow-x-hidden overflow-hidden max-w-full transition-all duration-500"
                    style={{
                      width: `${
                        ((currentStep * 2) / (filteredTimeline.length - 1)) *
                        100
                      }%`,
                    }}
                  ></div>
                  {/* Timeline Steps */}
                  <div className="relative flex justify-between w-full">
                    {Object.entries(groupedTimeline).map(
                      ([category, techniques], categoryIndex) => (
                        <div
                          key={category}
                          className="flex flex-col items-center"
                        >
                          {/* Step Indicator */}
                          <div
                            className={`flex items-center justify-center w-8 h-8 text-sm font-semibold rounded-full ${
                              categoryIndex <= currentStep
                                ? "bg-indigo-600 text-white dark:bg-indigo-900"
                                : "bg-gray-300 text-gray-600 dark:text-gray-200"
                            }`}
                          >
                            {/* Icons for Each Step */}
                            {category === "Defense Evasion" && (
                              <Shield className="h-5 w-5 text-white" />
                            )}
                            {category === "Discovery" && (
                              <Search className="h-5 w-5 text-white" />
                            )}
                            {category === "Execution" && (
                              <Play className="h-5 w-5 text-white" />
                            )}
                            {category === "Persistence" && (
                              <Clock className="h-5 w-5 text-white" />
                            )}
                          </div>
                          {/* Step Label */}
                          <p
                            className={`mt-2 text-sm ${
                              categoryIndex <= currentStep
                                ? "text-indigo-600"
                                : "text-gray-500"
                            }`}
                          >
                            {category}
                          </p>
                          {/* Step Link */}
                          {/* <div className="min-w-0 text-center flex-1 pt-1.5 flex flex-col space-y-2">
                            {techniques.map((technique, idx) => (
                              <div key={idx}>
                                <a
                                  href={technique.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 text-sm"
                                >
                                  {technique.techniqueName}
                                </a>
                              </div>
                            ))}
                          </div> */}
                          <button
                            onClick={() => setSelectedEvent(category)} // Open the corresponding step
                            className="text-indigo-600 hover:text-indigo-800 text-sm mt-1"
                          >
                            View Details
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      {/* Details Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 overflow-y-auto"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              aria-hidden="true"
            ></div>
            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={() => setSelectedEvent(null)}
                >
                  <span className="sr-only">Close</span>
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div>
                <div className="mt-3 sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Techniques in {selectedEvent}
                  </h3>
                  <div className="mt-4 space-y-6">
                    {groupedTimeline[selectedEvent]?.map((technique, idx) => (
                      <div key={idx}>
                        <h4 className="text-sm font-medium text-gray-500">
                          {technique.techniqueName}
                        </h4>
                        <div className="mt-1 space-y-1">
                          <p className="text-sm text-gray-900">
                            {/* Add descriptions, APIs, strings, etc., here */}
                            {technique.description}
                          </p>
                          <a
                            href={technique.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500"
                          >
                            View in MITRE ATT&CK
                            <ExternalLink className="ml-1 h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {analysisComplete && results && !results.error && (
        <div className="bg-white dark:bg-zinc-800 shadow sm:rounded-lg mt-8">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <Bot className="h-5 w-5 text-indigo-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                AI Analysis
              </h3>
            </div>
            
            {isAnalyzingWithGemini ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-gray-600 dark:text-white">Analyzing with AI...</span>
              </div>
            ) : (
              <div className="bg-zinc-900 rounded-lg p-6">
                <div className="text-white space-y-4">
                  <ReactMarkdown
                    components={{
                      p: ({node, ...props}) => <p className="text-white mb-4" {...props} />,
                      h1: ({node, ...props}) => <h1 className="text-white text-xl font-bold mb-4" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-white text-lg font-bold mb-3" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-white text-base font-bold mb-2" {...props} />,
                      strong: ({node, ...props}) => <strong className="text-white font-bold" {...props} />,
                      em: ({node, ...props}) => <em className="text-white italic" {...props} />,
                      li: ({node, ...props}) => <li className="text-white ml-4 mb-2" {...props} />,
                      ul: ({node, ...props}) => <ul className="text-white list-disc mb-4" {...props} />,
                      ol: ({node, ...props}) => <ol className="text-white list-decimal mb-4" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="text-white border-l-4 border-indigo-500 pl-4 my-4" {...props} />,
                      code: ({node, ...props}) => <code className="text-white bg-zinc-800 px-2 py-1 rounded" {...props} />
                    }}
                  >
                    {geminiAnalysis}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default FileAnalysisPage;

import React, { useState, useCallback } from "react";
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  Info,
  Search,
  Download,
  Calendar,
  RefreshCw,
  Network,
  Server,
  Wifi,
  Database,
  Globe,
  Mail,
  User,
  Link2,
} from "lucide-react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";

interface Asset {
  id: string;
  name: string;
  type: "domain" | "subdomain" | "ip" | "email" | "social" | "vulnerability";
  details: {
    value: string;
    riskLevel: "high" | "medium" | "low";
    description?: string;
    lastSeen?: string;
    source?: string;
  };
}

// Custom node styles
const nodeTypes = {
  domain: { background: "#818cf8", icon: Globe },
  subdomain: { background: "#60a5fa", icon: Globe },
  ip: { background: "#34d399", icon: Network },
  email: { background: "#fbbf24", icon: Mail },
  social: { background: "#f87171", icon: User },
  vulnerability: { background: "#f43f5e", icon: AlertTriangle },
};

// Initial nodes and edges for the graph
const initialNodes: Node[] = [
  {
    id: "1",
    type: "input",
    data: {
      label: "example.com",
      type: "domain",
      details: {
        value: "example.com",
        riskLevel: "medium",
      },
    },
    position: { x: 0, y: 0 },
    className: "bg-indigo-500 text-white rounded-lg p-2 shadow-lg",
  },
  {
    id: "2",
    data: {
      label: "admin.example.com",
      type: "subdomain",
      details: {
        value: "admin.example.com",
        riskLevel: "high",
        description: "Admin panel exposed",
      },
    },
    position: { x: -200, y: 100 },
    className: "bg-blue-500 text-white rounded-lg p-2 shadow-lg",
  },
  {
    id: "3",
    data: {
      label: "192.168.1.100",
      type: "ip",
      details: {
        value: "192.168.1.100",
        riskLevel: "medium",
        description: "Open ports: 80, 443, 22",
      },
    },
    position: { x: 200, y: 100 },
    className: "bg-green-500 text-white rounded-lg p-2 shadow-lg",
  },
];

const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", animated: true },
  { id: "e1-3", source: "1", target: "3", animated: true },
  { id: "e2-4", source: "2", target: "4", animated: true },
  { id: "e1-5", source: "1", target: "5", animated: true },
];

function ScanPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const startScan = () => {
    if (!targetInput) {
      alert("Please enter a target domain, IP, or email");
      return;
    }

    setIsScanning(true);
    setProgress(0);
    setScanComplete(false);

    // Simulate scan progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          setScanComplete(true);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedAsset({
      id: node.id,
      name: node.data.label,
      type: node.data.type,
      details: node.data.details,
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Attack Surface Scan
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          Map and visualize your attack surface by scanning domains, IPs, and
          digital footprint
        </p>
      </div>

      <div className="mt-12">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {/* Target Input */}
            <div className="max-w-xl mx-auto mb-8">
              <label
                htmlFor="target"
                className="block text-sm font-medium text-gray-700"
              >
                Target Domain, IP, or Email
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  name="target"
                  id="target"
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="example.com"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                />
                <button
                  onClick={startScan}
                  disabled={isScanning}
                  className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="animate-spin -ml-1 mr-2 h-5 w-5" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-5 w-5" />
                      Start Scan
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {isScanning && (
              <div className="max-w-xl mx-auto mb-8">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="mt-2 text-sm text-gray-500 text-center">
                  Scanning target... {progress}%
                </p>
              </div>
            )}

            {/* Attack Surface Graph */}
            {(scanComplete || nodes.length > 0) && (
              <div className="mt-8">
                <div
                  className="bg-gray-50 border border-gray-200 rounded-lg"
                  style={{ height: "600px" }}
                >
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={onNodeClick}
                    fitView
                  >
                    <Background />
                    <Controls />
                    <MiniMap />
                  </ReactFlow>
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-4 justify-center">
                  {Object.entries(nodeTypes).map(
                    ([type, { background, icon: Icon }]) => (
                      <div key={type} className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: background }}
                        ></div>
                        <Icon className="h-4 w-4" />
                        <span className="text-sm text-gray-600 capitalize">
                          {type}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Asset Details Modal */}
            {selectedAsset && (
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
                    <div>
                      <div className="mt-3 sm:mt-5">
                        <h3
                          className="text-lg leading-6 font-medium text-gray-900"
                          id="modal-title"
                        >
                          Asset Details
                        </h3>
                        <div className="mt-2">
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-500">
                                Type
                              </h4>
                              <p className="mt-1 text-sm text-gray-900 capitalize">
                                {selectedAsset.type}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-500">
                                Value
                              </h4>
                              <p className="mt-1 text-sm text-gray-900">
                                {selectedAsset.details.value}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-500">
                                Risk Level
                              </h4>
                              <span
                                className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  selectedAsset.details.riskLevel === "high"
                                    ? "bg-red-100 text-red-800"
                                    : selectedAsset.details.riskLevel ===
                                      "medium"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {selectedAsset.details.riskLevel
                                  .charAt(0)
                                  .toUpperCase() +
                                  selectedAsset.details.riskLevel.slice(1)}
                              </span>
                            </div>
                            {selectedAsset.details.description && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-500">
                                  Description
                                </h4>
                                <p className="mt-1 text-sm text-gray-900">
                                  {selectedAsset.details.description}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 sm:mt-6">
                      <button
                        type="button"
                        className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                        onClick={() => setSelectedAsset(null)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScanPage;

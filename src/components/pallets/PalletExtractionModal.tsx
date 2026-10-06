import React, { useState } from 'react';
import { Terminal, Copy, Check, Download, Code2, Database, X, FileCode } from 'lucide-react';
import {
  PYTHON_EXTRACTION_SCRIPT,
  EXTRACTION_SHELL_COMMANDS,
  SQL_DIRECT_QUERY,
} from '../../data/extractionScripts';

interface PalletExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PalletExtractionModal: React.FC<PalletExtractionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'python' | 'shell' | 'sql'>('python');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentContent =
    activeTab === 'python'
      ? PYTHON_EXTRACTION_SCRIPT
      : activeTab === 'shell'
      ? EXTRACTION_SHELL_COMMANDS
      : SQL_DIRECT_QUERY;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPython = () => {
    const blob = new Blob([PYTHON_EXTRACTION_SCRIPT], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'extract_data.py';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-[#E2E4E7] animate-in fade-in zoom-in-95 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E4E7] mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#1F6F8B]/10 text-[#1F6F8B]">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#1A1A2E] uppercase tracking-wide">
                Comandos e Instrucciones de Extracción de Data
              </h3>
              <p className="text-xs text-[#7A8FA6]">
                Guía técnica para extraer pallets observados desde WMS / BD y alimentar este dashboard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#7A8FA6] hover:text-[#1A1A2E] p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher & action buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 bg-[#F4F6F7] p-1 rounded-lg border border-[#E2E4E7]">
            <button
              onClick={() => setActiveTab('python')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === 'python'
                  ? 'bg-white text-[#1A1A2E] shadow-2xs'
                  : 'text-[#7A8FA6] hover:text-[#1A1A2E]'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-[#1F6F8B]" />
              <span>Script Python (extract_data.py)</span>
            </button>

            <button
              onClick={() => setActiveTab('shell')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === 'shell'
                  ? 'bg-white text-[#1A1A2E] shadow-2xs'
                  : 'text-[#7A8FA6] hover:text-[#1A1A2E]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-[#E0A23A]" />
              <span>Comandos Shell / CLI</span>
            </button>

            <button
              onClick={() => setActiveTab('sql')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === 'sql'
                  ? 'bg-white text-[#1A1A2E] shadow-2xs'
                  : 'text-[#7A8FA6] hover:text-[#1A1A2E]'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              <span>Query SQL Directo</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'python' && (
              <button
                onClick={handleDownloadPython}
                className="flex items-center gap-1.5 bg-[#F4F6F7] hover:bg-[#E2E4E7] border border-[#E2E4E7] text-[#1A1A2E] text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#1F6F8B]" />
                <span>Descargar .py</span>
              </button>
            )}

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-[#1A1A2E] hover:bg-[#2c2b42] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Code view box */}
        <div className="flex-1 overflow-auto bg-[#0F172A] rounded-xl p-4 border border-[#334155] font-mono text-xs text-slate-200 select-text">
          <pre className="whitespace-pre-wrap leading-relaxed">{currentContent}</pre>
        </div>

        {/* Informative footer */}
        <div className="mt-3 pt-3 border-t border-[#E2E4E7] flex items-center justify-between text-xs text-[#7A8FA6]">
          <span>
            Genera un archivo <strong>.xlsx</strong> que luego puedes importar con el botón <strong>«Cargar / Actualizar Data»</strong>.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#E2E4E7] hover:bg-[#d0d3d7] text-[#1A1A2E] font-bold rounded-lg text-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

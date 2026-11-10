import { CalendarDays, Megaphone, Layers, Cog, Coins, BookOpen, Wrench, ShieldCheck, Folder } from 'lucide-react'

// Categorie dell'archivio documenti (valori = CHECK in 20261110_condo_documents.sql)
export const DOCUMENT_CATEGORIES = [
  { value: 'assemblies', label: 'Assemblee di condominio', hint: 'Convocazioni e verbali', icon: CalendarDays },
  { value: 'notices', label: 'Avvisi', hint: "Comunicazioni dell'amministratore", icon: Megaphone },
  { value: 'cadastral', label: 'Documenti catastali', hint: 'Visure, planimetrie, tabelle millesimali', icon: Layers },
  { value: 'work_reports', label: 'Bollettini di lavorazione', hint: 'Rapportini e stati di avanzamento lavori', icon: Cog },
  { value: 'budgets', label: 'Bilanci e spese', hint: 'Preventivi, consuntivi, riparti', icon: Coins },
  { value: 'regulations', label: 'Regolamento condominiale', hint: 'Regolamento e allegati', icon: BookOpen },
  { value: 'maintenance', label: 'Manutenzioni e certificazioni', hint: 'Ascensore, caldaia, antincendio, impianti', icon: Wrench },
  { value: 'contracts', label: 'Contratti e assicurazioni', hint: 'Polizza fabbricato, contratti fornitori', icon: ShieldCheck },
  { value: 'other', label: 'Altro', hint: 'Tutto il resto', icon: Folder },
]

export const documentCategory = (v) => DOCUMENT_CATEGORIES.find((c) => c.value === v) || DOCUMENT_CATEGORIES[DOCUMENT_CATEGORIES.length - 1]

# AI Development Rules - ComfortCare

## Tech Stack
- **React 19 & TypeScript**: Core framework for building the user interface with type safety.
- **Tailwind CSS**: Primary styling method using utility classes (configured via CDN in `index.html`).
- **Supabase**: Backend-as-a-Service for Authentication, PostgreSQL Database, and File Storage.
- **React Router (v7)**: Handles client-side routing and navigation.
- **Zod**: Schema validation library used for form validation and data integrity.
- **React Hot Toast**: System for providing real-time feedback and notifications to users.
- **Material Symbols Outlined**: Primary icon library (loaded via Google Fonts).
- **Context API**: Used for global state management (Auth, Theme, etc.).

## Library Usage Rules
- **Styling**: Always use Tailwind CSS classes. Avoid writing custom CSS files unless absolutely necessary for print layouts.
- **Icons**: Prioritize **Material Symbols Outlined** using the `<span className="material-symbols-outlined">icon_name</span>` pattern. Use `lucide-react` only as a fallback.
- **Validation**: Every form must have a corresponding Zod schema in the `src/schemas/` directory.
- **Backend**: All database and auth operations must go through the `supabase` client defined in `src/lib/supabase.ts`.
- **Notifications**: Use `toast.success()`, `toast.error()`, or `toast.promise()` for all asynchronous operations.
- **Data Fetching**: Use the custom hooks in `src/hooks/` (e.g., `useClients`, `useVehicles`) to keep views clean.
- **PDFs**: Use `html2pdf.js` for generating documents like vouchers, following the implementation in `VoucherModal.tsx`.
- **Architecture**: 
  - `src/components/`: Reusable UI elements.
  - `src/views/`: Full page layouts/screens.
  - `src/types.ts`: Centralized TypeScript interfaces and enums.
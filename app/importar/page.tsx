import { ImportForm } from '@/components/ImportForm';

export default function ImportarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importar nuevo pedido</h1>
        <p className="text-sm text-slate-500">
          Sube el fichero .txt diario del pedido, indica su nombre/referencia y la fecha correspondiente. Si ya
          existe un pedido con el mismo nombre y fecha, se reemplazará con los datos nuevos.
        </p>
      </div>
      <ImportForm />
    </div>
  );
}

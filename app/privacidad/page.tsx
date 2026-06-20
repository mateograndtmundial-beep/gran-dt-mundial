import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageTitle, Card } from "@/components/ui";
import { Eyebrow } from "@/components/editorial";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de privacidad · Los 11 de Sampa",
  description:
    "Cómo Los 11 de Sampa recopila, usa y protege tus datos personales, y cuáles son tus derechos.",
};

const UPDATED = "20 de junio de 2026";

function Mailto() {
  return (
    <a href={`mailto:${SITE.contactEmail}`} className="font-semibold text-blue hover:underline">
      {SITE.contactEmail}
    </a>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="font-display text-2xl leading-none tracking-tight text-ink">{title}</h2>
      <div className="space-y-2.5 text-[15px] leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <PageTitle
        title="Política de privacidad"
        subtitle="Cuidamos tus datos. Acá te explicamos qué información recopilamos, para qué la usamos y cuáles son tus derechos."
      />
      <Eyebrow>Última actualización · {UPDATED}</Eyebrow>

      <Card className="space-y-7 p-6 sm:p-7">
        <Section title="Quiénes somos">
          <p>
            {SITE.name} es un juego de fantasy football del Mundial 2026. Esta política aplica al
            sitio <strong>los11desampa.com</strong> y a sus funcionalidades. Si tenés cualquier
            duda sobre tus datos, escribinos a <Mailto />.
          </p>
        </Section>

        <Section title="Qué datos recopilamos">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Datos de tu cuenta:</strong> el registro y el inicio de sesión los gestiona
              Clerk. Según cómo te registres, esto incluye tu email, tu nombre y/o los datos de tu
              cuenta de Google, y un identificador de usuario. Vos elegís un nombre de DT (nickname)
              público que se muestra en rankings y ligas.
            </li>
            <li>
              <strong>Datos del juego:</strong> el equipo que armás, tus ligas, los puntajes, los
              cambios y el saldo y los movimientos de pines.
            </li>
            <li>
              <strong>Datos de pagos:</strong> las compras de pines se procesan a través de Mercado
              Pago (Argentina) o dLocal (resto de LatAm). Esos proveedores procesan tus datos de
              pago; <strong>nosotros no almacenamos los datos de tu tarjeta</strong>. Guardamos el
              estado y el monto de la orden para acreditarte los pines.
            </li>
            <li>
              <strong>Datos técnicos:</strong> dirección IP, tipo de dispositivo y navegador, y país
              aproximado, a través de nuestro proveedor de hosting (Vercel).
            </li>
            <li>
              <strong>Cookies:</strong> usamos cookies necesarias para mantener tu sesión (Clerk).
            </li>
          </ul>
        </Section>

        <Section title="Para qué usamos tus datos">
          <ul className="list-disc space-y-2 pl-5">
            <li>Crear y administrar tu cuenta y tu equipo.</li>
            <li>Hacer funcionar el juego: rankings, ligas, puntajes, cambios y pines.</li>
            <li>Procesar tus compras de pines.</li>
            <li>Mejorar la app, entender problemas y darte soporte.</li>
            <li>Prevenir fraude, abuso y usos indebidos.</li>
            <li>Comunicarnos con vos sobre el servicio.</li>
          </ul>
        </Section>

        <Section title="Con quién compartimos tus datos">
          <p>
            No vendemos tus datos. Los compartimos únicamente con proveedores que nos ayudan a
            operar el servicio, en su rol de encargados del tratamiento:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Clerk</strong> — autenticación e identidad.</li>
            <li><strong>Neon</strong> — base de datos.</li>
            <li><strong>Vercel</strong> — hosting e infraestructura.</li>
            <li><strong>Mercado Pago</strong> y <strong>dLocal</strong> — procesamiento de pagos.</li>
            <li>
              <strong>Slack</strong> — recibimos notificaciones operativas internas (por ejemplo,
              una nueva cuenta o una compra) para monitorear el servicio.
            </li>
          </ul>
          <p>También podemos divulgar información si una ley o autoridad competente lo requiere.</p>
        </Section>

        <Section title="Cuánto tiempo conservamos los datos">
          <p>
            Conservamos tus datos mientras tengas una cuenta activa y durante el tiempo necesario
            para cumplir con obligaciones legales, contables y de seguridad. Si cerrás tu cuenta,
            eliminamos o anonimizamos tu información, salvo lo que debamos conservar por ley.
          </p>
        </Section>

        <Section title="Tus derechos">
          <p>
            Como titular de los datos, podés acceder, rectificar, actualizar y solicitar la
            supresión de tu información personal. Para ejercer estos derechos, escribinos a{" "}
            <Mailto />.
          </p>
          <p>
            En Argentina, la <strong>Agencia de Acceso a la Información Pública (AAIP)</strong>,
            órgano de control de la Ley N° 25.326 de Protección de los Datos Personales, atiende
            denuncias y reclamos por el incumplimiento de las normas de protección de datos.
          </p>
        </Section>

        <Section title="Menores de edad">
          <p>
            El servicio está pensado para mayores de 13 años. Si sos menor, usalo con el
            consentimiento y la supervisión de tu madre, padre o tutor. No recopilamos a sabiendas
            datos de menores de 13 años sin ese consentimiento.
          </p>
        </Section>

        <Section title="Seguridad">
          <p>
            Aplicamos medidas técnicas y organizativas razonables para proteger tus datos. Ningún
            sistema es 100% infalible, pero trabajamos para mantenerlos seguros.
          </p>
        </Section>

        <Section title="Cambios en esta política">
          <p>
            Podemos actualizar esta política. Si hacemos cambios relevantes, lo informaremos en el
            sitio. La fecha de “última actualización” indica la versión vigente.
          </p>
        </Section>

        <Section title="Contacto">
          <p>
            Por cualquier consulta sobre privacidad o tus datos personales, escribinos a <Mailto />.
          </p>
        </Section>
      </Card>

      <p className="text-sm text-ink-3">
        ¿Necesitás ayuda con tu cuenta?{" "}
        <Link href="/soporte" className="font-semibold text-blue hover:underline">
          Andá a Soporte
        </Link>
        .
      </p>
    </div>
  );
}

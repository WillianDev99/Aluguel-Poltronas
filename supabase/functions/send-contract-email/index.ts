import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY environment variable is not configured.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Verify Authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No Authorization header provided.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Invalid Authorization header format.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Parse Request Body
    const { clientEmail, clientName, signatureLink, reservationDetails } = await req.json()

    if (!clientEmail || !clientName || !signatureLink || !reservationDetails) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: clientEmail, clientName, signatureLink, reservationDetails' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { pickupDate, returnDate, vehicleModel, vehiclePlate, totalValue, securityDeposit } = reservationDetails

    // Format currencies
    const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

    // Build beautiful HTML email template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Seu Contrato de Locação Pós Leve</title>
        <style>
          body {
            font-family: 'Poppins', Arial, sans-serif;
            background-color: #f1f5f9;
            color: #334155;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
            overflow: hidden;
            border: 1px solid #e2e8f0;
          }
          .header {
            background-color: #1b4e52;
            color: #ffffff;
            text-align: center;
            padding: 30px 20px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .content {
            padding: 30px 40px;
            line-height: 1.6;
          }
          .welcome {
            font-size: 18px;
            font-weight: 700;
            color: #1b4e52;
            margin-bottom: 20px;
          }
          .voucher-box {
            background-color: #edf1f0;
            border-left: 4px solid #ec9b85;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
          }
          .voucher-title {
            font-weight: 700;
            color: #1b4e52;
            margin-bottom: 10px;
            font-size: 15px;
            text-transform: uppercase;
          }
          .voucher-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
            font-size: 13px;
          }
          .grid-item {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px dashed #cbd5e1;
            padding-bottom: 4px;
          }
          .grid-label {
            font-weight: 600;
            color: #475569;
          }
          .grid-value {
            color: #0f172a;
            font-weight: 700;
          }
          .btn-container {
            text-align: center;
            margin: 35px 0;
          }
          .btn {
            background-color: #ec9b85;
            color: #1b4e52 !important;
            text-decoration: none;
            padding: 14px 30px;
            font-weight: 700;
            font-size: 15px;
            border-radius: 8px;
            display: inline-block;
            box-shadow: 0 4px 6px rgba(236, 155, 133, 0.2);
            transition: all 0.2s;
          }
          .warning-box {
            background-color: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 8px;
            padding: 15px;
            font-size: 12px;
            color: #b45309;
            margin-top: 20px;
          }
          .footer {
            background-color: #f8fafc;
            text-align: center;
            padding: 20px;
            font-size: 11px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>PÓS LEVE</h1>
          </div>
          <div class="content">
            <div class="welcome">Olá, ${clientName}!</div>
            <p>Seu pedido de locação de equipamento pós-cirúrgico foi gerado com sucesso no nosso sistema. Para que possamos dar andamento e garantir a reserva nas datas solicitadas, precisamos da assinatura do seu contrato.</p>
            
            <div class="voucher-box">
              <div class="voucher-title">Detalhes da Locação (Voucher)</div>
              <div class="voucher-grid">
                <div class="grid-item">
                  <span class="grid-label">Equipamento:</span>
                  <span class="grid-value">${vehicleModel}</span>
                </div>
                <div class="grid-item">
                  <span class="grid-label">Código/Série:</span>
                  <span class="grid-value">${vehiclePlate}</span>
                </div>
                <div class="grid-item">
                  <span class="grid-label">Período:</span>
                  <span class="grid-value">${pickupDate} a ${returnDate}</span>
                </div>
                <div class="grid-item">
                  <span class="grid-label">Valor Total:</span>
                  <span class="grid-value">${formatBRL(totalValue)}</span>
                </div>
                <div class="grid-item">
                  <span class="grid-label">Caução de Segurança:</span>
                  <span class="grid-value">${formatBRL(securityDeposit)}</span>
                </div>
              </div>
            </div>

            <p>Clique no botão abaixo para ler os termos e realizar a assinatura digital do seu contrato. Você pode fazer a assinatura diretamente no seu celular ou computador.</p>

            <div class="btn-container">
              <a href="${signatureLink}" class="btn" target="_blank">ASSINAR CONTRATO DIGITAL</a>
            </div>

            <div class="warning-box">
              <strong>IMPORTANTE:</strong> Conforme nossa política de locação, o equipamento não está garantido para a sua reserva até a efetivação e compensação do pagamento do <strong>Caução de Segurança</strong>. As datas solicitadas continuarão disponíveis para outros interessados até que a compensação seja realizada.
            </div>

            <p style="margin-top: 25px; font-size: 13px;">Se você tiver qualquer dúvida ou precisar de ajuda no processo de assinatura, responda a este e-mail ou entre em contato pelo nosso canal oficial de atendimento.</p>
          </div>
          <div class="footer">
            <p>PÓS LEVE LTDA - Soluções de Cuidado Pós-Operatório</p>
            <p>Este sistema utiliza assinatura digital com validade jurídica de acordo com a Medida Provisória nº 2.200-2/2001.</p>
          </div>
        </div>
      </body>
      </html>
    `

    // Determine sender address
    const senderEmail = Deno.env.get('SENDER_EMAIL') || 'Pós Leve <onboarding@resend.dev>'

    // Call Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: senderEmail,
        to: [clientEmail.toLowerCase()],
        subject: `Contrato e Voucher de Locação - ${clientName}`,
        html: emailHtml,
      }),
    })

    if (!res.ok) {
      const errorData = await res.json()
      console.error('Error from Resend API:', errorData)
      throw new Error(errorData.message || 'Failed to send email via Resend.')
    }

    const resData = await res.json()

    return new Response(JSON.stringify({ success: true, messageId: resData.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Error executing send-contract-email:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

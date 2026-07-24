import asyncio

import resend

from app.core.config import settings

resend.api_key = settings.RESEND_API_KEY

LOGO_URL = f"{settings.FRONTEND_URL}/logo-black-bg.png"

_FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"


def _base_email(preheader: str, title: str, body_html: str) -> str:
    return f"""<!doctype html>
<html lang="ru" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-scheme" content="dark" />
    <title>{title}</title>
    <!--[if mso]>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    </noscript>
    <![endif]-->
    <style>
      body, table, td {{ font-family: {_FONT}; }}
      body {{ margin:0; padding:0; background-color:#000000; -webkit-text-size-adjust:100%; }}
      img {{ border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }}
      a {{ text-decoration:none; }}
      .card {{ background-color:#111111; border:1px solid #232323; border-radius:24px; }}
      .code-box {{ background:#000000; border:1px solid #262626; border-radius:16px; }}
      @media screen and (max-width:600px) {{
        .wrapper {{ padding:28px 12px !important; }}
        .card {{ border-radius:16px !important; padding:28px 20px !important; }}
        .title {{ font-size:18px !important; }}
        .code {{ font-size:28px !important; letter-spacing:5px !important; padding:14px 16px !important; }}
        .btn {{ display:block !important; width:100% !important; box-sizing:border-box; }}
      }}
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:#000000;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
      {preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#000000;">
      <tr>
        <td align="center" class="wrapper" style="padding:48px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px; margin:0 auto;">
            <tr>
              <td align="center" style="padding-bottom:28px;">
                <img src="{LOGO_URL}" alt="Dreyze AI" width="64" height="64"
                     style="display:inline-block; width:64px; height:64px; border-radius:18px;" />
              </td>
            </tr>
            <tr>
              <td class="card" style="padding:40px; color:#ffffff;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" class="title" style="font-size:20px; font-weight:600; color:#ffffff; padding-bottom:24px;">
                      {title}
                    </td>
                  </tr>
                  <tr>
                    <td>{body_html}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:24px;">
                <p style="margin:0 0 8px 0; font-size:12px; color:#6f6f6f;">
                  Если вы не запрашивали это письмо, просто проигнорируйте его.
                </p>
                <p style="margin:0; font-size:12px; color:#4a4a4a;">Dreyze AI</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


async def send_verification_code(email: str, code: str, name: str) -> None:
    body = f"""
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="color:#c9c9c9; font-size:14px; line-height:1.6; padding-bottom:24px;">
            Привет, {name}! Ваш код подтверждения регистрации:
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom:20px;">
            <span class="code code-box" style="display:inline-block; font-size:36px; font-weight:700; letter-spacing:8px;
                         color:#ffffff; padding:16px 24px;">{code}</span>
          </td>
        </tr>
        <tr>
          <td align="center" style="color:#8a8a8a; font-size:13px;">Код действителен 10 минут.</td>
        </tr>
      </table>
    """
    await asyncio.to_thread(
        resend.Emails.send,
        {
            "from": settings.EMAIL_FROM,
            "to": [email],
            "subject": f"Ваш код подтверждения: {code}",
            "html": _base_email(
                f"Ваш код подтверждения: {code}",
                "Подтверждение регистрации",
                body,
            ),
        },
    )


async def send_password_reset(email: str, reset_url: str) -> None:
    body = f"""
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="color:#c9c9c9; font-size:14px; line-height:1.6; padding-bottom:24px;">
            Мы получили запрос на сброс пароля для вашего аккаунта.
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom:20px;">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{reset_url}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="50%" fillcolor="#ffffff" stroke="f">
            <w:anchorlock/>
            <center style="color:#000000;font-family:{_FONT};font-size:14px;font-weight:600;">Сбросить пароль</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <a href="{reset_url}" class="btn" style="display:inline-block; background:#ffffff; color:#000000;
                      font-weight:600; font-size:14px; padding:14px 28px; border-radius:9999px;">
              Сбросить пароль
            </a>
            <!--<![endif]-->
          </td>
        </tr>
        <tr>
          <td align="center" style="color:#8a8a8a; font-size:13px; padding-bottom:16px;">
            Ссылка действительна 1 час и работает только один раз.
          </td>
        </tr>
        <tr>
          <td align="center" style="color:#5a5a5a; font-size:12px; word-break:break-all;">
            Или скопируйте ссылку: <a href="{reset_url}" style="color:#8a8a8a;">{reset_url}</a>
          </td>
        </tr>
      </table>
    """
    await asyncio.to_thread(
        resend.Emails.send,
        {
            "from": settings.EMAIL_FROM,
            "to": [email],
            "subject": "Сброс пароля",
            "html": _base_email(
                "Мы получили запрос на сброс пароля для вашего аккаунта",
                "Восстановление пароля",
                body,
            ),
        },
    )

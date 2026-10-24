import type { CSSProperties } from "react";
import type { Locale } from "@/i18n/config";
import { createSiteTranslator } from "@/i18n/translate";
import { LanguageSwitcher } from "@/components/language-switcher";
import { localizedPath } from "@/lib/paths";
import { SiteRuntime } from "@/components/site-runtime";
import { BrandLogo } from "@/components/illustrations";

export function TermsPage({ locale }: { locale: Locale }) {
  const t = createSiteTranslator(locale);
  return (
    <div className="site-body page-terms">
      <SiteRuntime page="terms" locale={locale} />

      <header className="nav" id="siteNav">
        <div className="wrap">
          <a
            className="nav-lockup"
            href={localizedPath("/", locale)}
            aria-label={t("nav.home_aria")}
          >
            <BrandLogo />
          </a>
          <div className="nav-right">
            <LanguageSwitcher
              locale={locale}
              pathname="/terms/"
              label={t("nav.lang_aria")}
            />
          </div>
        </div>
      </header>
      <main className="legal-page">
        <div className="wrap legal-wrap">
          <a className="text-link legal-back" href={localizedPath("/", locale)}>
            <svg
              className="arrow"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M19 12H5M11 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
            </svg>
            <span data-str="terms.back">{t("terms.back")}</span>
          </a>
          <h1 className="h-section legal-title" data-str="terms.title">
            {t("terms.title")}
          </h1>
          <p className="lead" data-str="terms.lead">
            {t("terms.lead")}
          </p>
          <p className="legal-updated" data-str="terms.updated">
            {t("terms.updated")}
          </p>
          <div className="legal-toc">
            <span className="eyebrow" data-str="terms.toc">
              {t("terms.toc")}
            </span>
            <ol>
              <li>
                <a href="#terms" data-str="footer.linkTerms">
                  {t("footer.linkTerms")}
                </a>
              </li>
              <li>
                <a href="#privacy" data-str="footer.linkPrivacy">
                  {t("footer.linkPrivacy")}
                </a>
              </li>
              <li>
                <a href="#refund" data-str="footer.linkRefund">
                  {t("footer.linkRefund")}
                </a>
              </li>
            </ol>
          </div>
          <section className="legal-sec" id="terms">
            {locale === "zh-HK" && (
              <div className="legal-zh" lang="zh-HK">
                <h2>{"場地細則與條款"}</h2>
                <ul>
                  <li>
                    {
                      "當您使用本服務或於預訂時勾選「我同意服務條款政策」，即表示您已閱讀、充分瞭解並同意接受本條款之全部內容。"
                    }
                  </li>
                  <li>
                    <strong>{"個人資料私隱："}</strong>
                    {
                      "本公司嚴格遵守《個人資料（私隱）條例》，妥善保護並合理使用您的個人資料。"
                    }
                  </li>
                  <li>
                    <strong>{"電子文件同意："}</strong>
                    {
                      "當您使用本公司經由支付平台（如 KPay 等）提供之服務時，即同意以電子文件作為意思表示之方式。"
                    }
                  </li>
                  <li>
                    <strong>{"預訂與變更權利："}</strong>
                    {
                      "本公司保留是否接納場地預約或課程報名的最終決定權。如因突發狀況、特殊原因或不可抗力事件致無法提供服務，我們將以電話或電郵等方式聯繫您安排改期或全額退款，本公司不承擔額外賠償責任。"
                    }
                  </li>
                  <li>
                    <strong>{"確認延遲免責："}</strong>
                    {
                      "如因使用者資料填寫不完整、聯絡資料有誤、無法聯繫，或遇天災、系統維護、場地保養等情況，確認時間將順延，本場地概不承擔因此衍生之相關損失。"
                    }
                  </li>
                  <li>
                    <strong>{"免責聲明與責任限制："}</strong>
                    {
                      "使用者及隨行人員於本公司之場地內須自行注意人身及財物安全。對於因個人疏忽、不當操作或意外導致之任何傷亡或財物損失，本公司在法律允許的最大範圍內不承擔法律與賠償責任。"
                    }
                  </li>
                  <li>
                    <strong>{"設施與器材損壞賠償："}</strong>
                    {
                      "使用者應愛護場地設施及借用器材。如有任何損壞、遺失或異常髒亂，使用者須按原廠修復價格或重置成本全額賠償，並可能需支付額外清潔費用。"
                    }
                  </li>
                  <li>
                    <strong>{"場地安全與使用規範："}</strong>
                    {
                      "場地內嚴禁吸煙、賭博、攜帶危險品或進行任何違法活動。使用者須遵守現場工作人員之安全指引，如有違規且經勸阻無效者，本場地有權要求其立即離場且不予退款。"
                    }
                  </li>
                  <li>
                    <strong>{"營運調整與條款修改權："}</strong>
                    {
                      "本公司保留隨時變更、修改或終止本場地細則與服務條款之權利，修訂後之內容自更新公布於官方管道起生效，恕不另行個別通知。"
                    }
                  </li>
                  <li>
                    {
                      "如有任何爭議，Hong Kong Sporting Hub 保留最終決定權及修改條款之權利。"
                    }
                  </li>
                </ul>
              </div>
            )}
            {locale === "en" && (
              <div className="legal-en" lang="en">
                <h2>{"Terms and Conditions"}</h2>
                <ul>
                  <li>
                    {
                      'By using this service or checking "I agree to the Terms of Service Policy" upon booking, you acknowledge that you have read, fully understood, and agreed to accept all the content of these terms.'
                    }
                  </li>
                  <li>
                    <strong>{"Personal Data Privacy:"}</strong>
                    {
                      " The Company strictly complies with the Personal Data (Privacy) Ordinance to properly protect and reasonably use your personal data."
                    }
                  </li>
                  <li>
                    <strong>{"Electronic Consent:"}</strong>
                    {
                      " When using services provided by the Company through payment platforms (such as KPay), you agree to use electronic documents as the form of expression of intent."
                    }
                  </li>
                  <li>
                    <strong>{"Booking and Modification Rights:"}</strong>
                    {
                      " The Company reserves the final right to accept venue bookings or course enrollments. In the event of emergencies, special circumstances, or force majeure that prevent service provision, we will contact you via phone or email to reschedule or process a full refund. The Company assumes no additional liability for compensation."
                    }
                  </li>
                  <li>
                    <strong>{"Confirmation Delay Disclaimer:"}</strong>
                    {
                      " If confirmation is delayed due to incomplete user information, incorrect contact details, inability to reach you, or force majeure events like natural disasters, system maintenance, or venue maintenance, the venue accepts no liability for any associated losses."
                    }
                  </li>
                  <li>
                    <strong>{"Disclaimer and Limitation of Liability:"}</strong>
                    {
                      " Users and accompanying guests must take care of their personal safety and belongings within the venue. To the maximum extent permitted by law, the Company assumes no legal or financial liability for any injuries, casualties, or property loss caused by personal negligence, improper operation, or accidents."
                    }
                  </li>
                  <li>
                    <strong>
                      {"Facility and Equipment Damage Compensation:"}
                    </strong>
                    {
                      " Users must take good care of venue facilities and borrowed equipment. In case of any damage, loss, or abnormal dirtiness, users must compensate at full repair or replacement cost, and may be required to pay additional cleaning fees."
                    }
                  </li>
                  <li>
                    <strong>{"Venue Safety and Conduct Rules:"}</strong>
                    {
                      " Smoking, gambling, possession of dangerous items, or any illegal activities are strictly prohibited within the venue. Users must follow the safety instructions of staff on-site. The venue reserves the right to ask violators to leave immediately without a refund after unheeded warnings."
                    }
                  </li>
                  <li>
                    <strong>
                      {"Operational Adjustments and Right to Amend Terms:"}
                    </strong>
                    {
                      " The Company reserves the right to alter, modify, or terminate these venue rules and terms of service at any time. The revised content takes effect upon publication on official channels without prior individual notice."
                    }
                  </li>
                  <li>
                    {
                      "In case of any dispute, Hong Kong Sporting Hub reserves the right of final decision and to amend the terms."
                    }
                  </li>
                </ul>
              </div>
            )}
          </section>
          <section className="legal-sec" id="privacy">
            {locale === "zh-HK" && (
              <div className="legal-zh" lang="zh-HK">
                <h2>{"私隱保護政策"}</h2>
                <ul>
                  <li>
                    <strong>{"個人資料之收集及使用目的："}</strong>
                    <ul>
                      <li>
                        {
                          "本公司為 KPay 之合作商戶。當閣下進行預訂或使用服務時，本公司將透過 KPay 平台於結帳及履行合約過程中收集閣下的個人資料及消費相關資訊（包括但不限於姓名、聯絡電話、電郵地址及交易紀錄）。"
                        }
                      </li>
                      <li>
                        {
                          "該等資料將用於提供場地、課程預訂與服務、身份核實、處理客戶查詢及投訴、改善服務質素，以及進行與 KPay 相關之行銷推廣活動（如獲得閣下同意）。"
                        }
                      </li>
                    </ul>
                  </li>
                  <li>
                    <strong>{"資料披露與共享："}</strong>
                    <ul>
                      <li>
                        {
                          "本公司不會向任何第三方出售閣下的個人資料。除以下情況外，本公司亦不會向第三方披露閣下的個人資料：(a) 配合司法機關、執法部門或法定機構之依法要求或調查；(b) 為保障本公司、閣下或其他客戶之權益、財產或安全；或 (c) 因閣下違反法例或本公司服務條款而有必要採取法律行動。"
                        }
                      </li>
                    </ul>
                  </li>
                  <li>
                    <strong>{"資料安全與保存："}</strong>
                    <ul>
                      <li>
                        {
                          "本公司採取合理的技術及組織措施保障閣下的個人資料免受未獲授權的存取、披露、遺失或損壞。個人資料僅會保存至達到收集目的所需的期限，或遵守相關法律法規規定的保存期限。"
                        }
                      </li>
                    </ul>
                  </li>
                  <li>
                    <strong>{"查閱及更正資料權利："}</strong>
                    <ul>
                      <li>
                        {
                          "根據香港《個人資料（私隱）條例》，閣下有權查閱及要求更正本公司所持有的閣下個人資料。如需提出要求，請透過本公司官方聯絡方式與我們聯絡。"
                        }
                      </li>
                    </ul>
                  </li>
                  <li>
                    <strong>{"免責聲明與第三方連結："}</strong>
                    <ul>
                      <li>
                        {
                          "本服務可能包含前往第三方網站或平台（包括 KPay）的連結。本公司對於該等第三方網站的私隱做法或內容概不負責，建議閣下閱讀該等第三方的私隱政策。"
                        }
                      </li>
                    </ul>
                  </li>
                  <li>
                    <strong>{"私隱政策之修訂："}</strong>
                    <ul>
                      <li>
                        {
                          "本公司保留隨時修改本私隱政策之權利。如有涉及閣下權益之重大變更，本公司將於網站適當位置予以公告。"
                        }
                      </li>
                    </ul>
                  </li>
                </ul>
              </div>
            )}
            {locale === "en" && (
              <div className="legal-en" lang="en">
                <h2>{"Privacy Policy"}</h2>
                <ul>
                  <li>
                    <strong>
                      {"Collection and Purpose of Use of Personal Data:"}
                    </strong>
                    <ul>
                      <li>
                        {
                          "Our company is a partner merchant of KPay. When you make a booking or use our services, our company will collect your personal data and transaction-related information (including but not limited to name, contact phone number, email address, and transaction records) through the KPay platform during checkout and contract fulfillment."
                        }
                      </li>
                      <li>
                        {
                          "Such data will be used for providing venue and course bookings and services, identity verification, handling customer inquiries and complaints, improving service quality, and conducting marketing and promotional activities related to KPay (subject to your consent)."
                        }
                      </li>
                    </ul>
                  </li>
                  <li>
                    <strong>{"Disclosure and Sharing of Information:"}</strong>
                    <ul>
                      <li>
                        {
                          "Our company will not sell your personal data to any third party. Except for the following circumstances, our company will not disclose your personal data to third parties: (a) complying with lawful requests or investigations by judicial authorities, law enforcement departments, or statutory bodies; (b) protecting the rights, property, or safety of our company, you, or other customers; or (c) taking necessary legal action due to your violation of laws or our terms of service."
                        }
                      </li>
                    </ul>
                  </li>
                  <li>
                    <strong>{"Data Security and Retention:"}</strong>
                    <ul>
                      <li>
                        {
                          "Our company adopts reasonable technical and organizational measures to safeguard your personal data against unauthorized access, disclosure, loss, or damage. Personal data will only be retained for as long as necessary to fulfill the purposes of collection, or to comply with applicable laws and regulations."
                        }
                      </li>
                    </ul>
                  </li>
                  <li>
                    <strong>{"Right to Access and Correct Data:"}</strong>
                    <ul>
                      <li>
                        {
                          "In accordance with the Personal Data (Privacy) Ordinance of Hong Kong, you have the right to request access to and correction of your personal data held by our company. If you wish to make such a request, please contact us through our official contact channels."
                        }
                      </li>
                    </ul>
                  </li>
                  <li>
                    <strong>{"Disclaimer and Third-Party Links:"}</strong>
                    <ul>
                      <li>
                        {
                          "This service may contain links to third-party websites or platforms (including KPay). Our company is not responsible for the privacy practices or content of such third-party websites and recommends that you read their respective privacy policies."
                        }
                      </li>
                    </ul>
                  </li>
                  <li>
                    <strong>{"Amendments to the Privacy Policy:"}</strong>
                    <ul>
                      <li>
                        {
                          "Our company reserves the right to amend this Privacy Policy at any time. In the event of material changes affecting your rights, our company will issue an announcement in an appropriate location on the website."
                        }
                      </li>
                    </ul>
                  </li>
                </ul>
              </div>
            )}
          </section>
          <section className="legal-sec" id="refund">
            {locale === "zh-HK" && (
              <div className="legal-zh" lang="zh-HK">
                <h2>{"退款及取消預訂政策"}</h2>
                <ul>
                  <li>
                    {
                      "所有預訂必須透過本公司官方系統提交，並於指定時限內完成全額付款後方為確認。除本政策另有規定外，所有已支付之費用概不退還，亦不可轉讓。"
                    }
                  </li>
                  <li>
                    <strong>{"惡劣天氣安排："}</strong>
                    {
                      "如於預訂時段前 2 小時內發出八號或以上熱帶氣旋警告信號或黑色暴雨警告信號，顧客可於事發後 30 天內申請改期或退款。其他天氣狀況（如三號強風信號、紅色暴雨警告等）一般不設退款或改期。"
                    }
                  </li>
                  <li>
                    <strong>{"不可抗力及本公司取消："}</strong>
                    {
                      "如因不可抗力、場地維修或本公司無法控制之情況而未能提供相關產品或服務，本公司有權取消預訂，並會退還受影響訂單之實際已付款項。本公司毋須就此承擔任何額外賠償責任。"
                    }
                  </li>
                  <li>
                    <strong>{"退款手續及行政費："}</strong>
                    {
                      "所有經批准之退款將按原付款方式退回。本公司保留扣除相關支付平台手續費或行政費用（如適用）之權利。"
                    }
                  </li>
                  <li>
                    <strong>{"個人原因取消："}</strong>
                    {
                      "因顧客個人原因（包括但不限於缺席、遲到或行程變更）而未能使用服務，將不獲任何退款或補償。"
                    }
                  </li>
                  <li>
                    {
                      "如有任何爭議，Hong Kong Sporting Hub 保留最終決定權及修改條款之權利。"
                    }
                  </li>
                </ul>
              </div>
            )}
            {locale === "en" && (
              <div className="legal-en" lang="en">
                <h2>{"Refund and Booking Cancellation Policy"}</h2>
                <ul>
                  <li>
                    {
                      "All bookings must be submitted through our official system and are considered confirmed only upon full payment within the specified time limit. Unless otherwise specified in this policy, all paid fees are non-refundable and non-transferable."
                    }
                  </li>
                  <li>
                    <strong>{"Inclement Weather Arrangement:"}</strong>
                    {
                      " If a Tropical Cyclone Warning Signal No. 8 or above, or a Black Rainstorm Warning Signal is issued within 2 hours prior to the scheduled slot, customers may apply for a rescheduling or refund within 30 days of the incident. Other weather conditions (such as Strong Wind Signal No. 3, Red Rainstorm Warning, etc.) are generally not eligible for refunds or rescheduling."
                    }
                  </li>
                  <li>
                    <strong>{"Force Majeure and Company Cancellation:"}</strong>
                    {
                      " If the relevant products or services cannot be provided due to force majeure, venue maintenance, or circumstances beyond our control, the company reserves the right to cancel the booking and refund the actual amount paid for the affected order. The company assumes no additional liability or compensation for such cancellations."
                    }
                  </li>
                  <li>
                    <strong>
                      {"Refund Procedure and Administrative Fees:"}
                    </strong>
                    {
                      " All approved refunds will be processed via the original payment method. The company reserves the right to deduct relevant payment platform processing fees or administrative charges (if applicable)."
                    }
                  </li>
                  <li>
                    <strong>{"Personal Reasons for Cancellation:"}</strong>
                    {
                      " No refunds or compensation will be provided if services cannot be used due to personal reasons (including but not limited to absence, lateness, or schedule changes)."
                    }
                  </li>
                  <li>
                    {
                      "In case of any dispute, Hong Kong Sporting Hub reserves the right of final decision and to amend the terms and conditions."
                    }
                  </li>
                </ul>
              </div>
            )}
          </section>
          <section className="legal-sec legal-contact" id="contact">
            <h2 data-str="nav.contact">{t("nav.contact")}</h2>
            <p data-str="terms.contactLead">{t("terms.contactLead")}</p>
            <dl className="facts">
              <div className="facts-row">
                <dt data-str="find.addressLabel">{t("find.addressLabel")}</dt>
                <dd data-str="find.addressValue">{t("find.addressValue")}</dd>
              </div>
              <div className="facts-row">
                <dt data-str="find.waLabel">{t("find.waLabel")}</dt>
                <dd>
                  <a
                    href="#"
                    id="waTerms"
                    target="_blank"
                    rel="noopener"
                    data-str="find.waValue"
                  >
                    {t("find.waValue")}
                  </a>
                </dd>
              </div>
              <div className="facts-row">
                <dt data-str="find.emailLabel">{t("find.emailLabel")}</dt>
                <dd>
                  <a
                    href="mailto:info@asportinghub.com"
                    data-str="find.emailValue"
                  >
                    {t("find.emailValue")}
                  </a>
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </main>
      <footer className="site-footer legal-footer">
        <div className="wrap">
          <div className="footer-legal">
            <a href="#terms" data-str="footer.linkTerms">
              {t("footer.linkTerms")}
            </a>
            <a href="#privacy" data-str="footer.linkPrivacy">
              {t("footer.linkPrivacy")}
            </a>
            <a href="#refund" data-str="footer.linkRefund">
              {t("footer.linkRefund")}
            </a>
          </div>
          <div className="footer-bottom">
            <span data-str="footer.bottomName">{t("footer.bottomName")}</span>
            <span id="footer-year">{"2026"}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

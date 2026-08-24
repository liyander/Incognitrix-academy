import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { verifyCertificate } from '../services/certificates'

function formatDate(value) {
  if (!value) {
    return 'Not available'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Not available'
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function CertificateVerificationPage() {
  const { certificateId: routeCertificateId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchCertificateId = searchParams.get('certificateId') || ''
  const initialCertificateId = routeCertificateId || searchCertificateId || ''

  const [certificateId, setCertificateId] = useState(initialCertificateId)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const lastVerifiedIdRef = useRef('')

  const runVerification = async (value) => {
    const trimmedValue = String(value || '').trim()

    if (!trimmedValue) {
      setError('Enter a certificate ID to verify.')
      setResult(null)
      return
    }

    setIsLoading(true)
    setError('')
    setResult(null)
    lastVerifiedIdRef.current = trimmedValue

    try {
      const response = await verifyCertificate(trimmedValue)
      setResult(response)
      setSearchParams({ certificateId: trimmedValue })
    } catch (verificationError) {
      const message = verificationError?.message || 'Verification failed.'
      setError(message)
      setResult({ valid: false, message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = (event) => {
    event.preventDefault()
    void runVerification(certificateId)
  }

  useEffect(() => {
    const incomingCertificateId = routeCertificateId || searchCertificateId || ''

    if (!incomingCertificateId) {
      setCertificateId('')
      setResult(null)
      setError('')
      lastVerifiedIdRef.current = ''
      return
    }

    setCertificateId(incomingCertificateId)

    if (incomingCertificateId !== lastVerifiedIdRef.current) {
      void runVerification(incomingCertificateId)
    }
  }, [routeCertificateId, searchCertificateId])

  const certificate = result?.certificate || null

  return (
    <main className="pt-24 min-h-screen px-6 pb-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <section className="rounded-2xl bg-surface-container-lowest border-l-4 border-primary p-8 md:p-10 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-primary/10 blur-3xl rounded-full" />
          <div className="relative z-10 max-w-3xl">
            <p className="font-headline text-[10px] tracking-normal text-primary font-bold mb-4">
              Public Verification
            </p>
            <h1 className="font-headline text-4xl md:text-6xl font-black tracking-tight mb-4">
              Certificate Check
            </h1>
            <p className="text-on-surface-variant leading-relaxed max-w-2xl">
              Verify a certificate without signing in. Enter the certificate ID to confirm the learner, course,
              and issue date.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="rounded-2xl xl:col-span-5 bg-surface-container-low p-8 border border-outline-variant/60">
            <h2 className="font-headline text-xl font-bold tracking-tight mb-2">Lookup Certificate</h2>
            <p className="text-xs tracking-normal text-on-surface-variant font-headline mb-6">
              Authentication is not required
            </p>

            <form className="space-y-5" onSubmit={handleVerify}>
              <label className="block space-y-2">
                <span className="text-[10px] font-headline tracking-normal text-on-surface-variant">
                  Certificate ID
                </span>
                <input
                  className="rounded-2xl w-full bg-surface border border-outline-variant px-4 py-4 text-on-surface font-headline tracking-normal text-sm focus:outline-none focus:border-primary"
                  onChange={(event) => setCertificateId(event.target.value)}
                  placeholder="CERT-..."
                  value={certificateId}
                  spellCheck={false}
                  autoComplete="off"
                />
              </label>

              <button
                className="rounded-2xl w-full py-4 bg-primary text-on-primary font-headline text-[10px] tracking-normal font-bold hover:bg-primary-container transition-colors active:scale-[0.99]"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? 'VERIFYING...' : 'Verify certificate'}
              </button>
            </form>

            <div className="mt-6 text-sm text-on-surface-variant leading-relaxed">
              <p>
                This page uses the public verification endpoint and does not require an account. Share the ID from
                the certificate footer or the verification link.
              </p>
            </div>
          </div>

          <div className="xl:col-span-7 space-y-8">
            {error ? (
              <div className="rounded-2xl bg-error-container/20 border border-error/40 p-6">
                <p className="font-headline text-xs tracking-normal text-error font-bold mb-2">
                  Verification Failed
                </p>
                <p className="text-on-surface">{error}</p>
              </div>
            ) : null}

            {result?.valid ? (
              <div className="rounded-2xl bg-surface-container-high p-8 border-l-4 border-primary space-y-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-headline text-[10px] tracking-normal text-primary font-bold mb-2">
                      Verified
                    </p>
                    <h2 className="font-headline text-2xl md:text-3xl font-black tracking-tight">
                      Certificate Confirmed
                    </h2>
                  </div>
                  <span className="rounded-lg inline-flex items-center gap-2 px-3 py-2 bg-primary-container text-on-primary-container font-headline text-[10px] font-bold tracking-normal">
                    <span className="material-symbols-outlined text-sm">verified</span>
                    Valid
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <InfoCard label="Certificate ID" value={certificate?.certificateId} />
                  <InfoCard label="Learner" value={certificate?.fullName} />
                  <InfoCard label="First Name" value={certificate?.firstName || 'Not provided'} />
                  <InfoCard label="Last Name" value={certificate?.lastName || 'Not provided'} />
                  <InfoCard label="Course" value={certificate?.pathTitle} />
                  <InfoCard label="Issued On" value={formatDate(certificate?.issuedAt)} />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-t border-outline-variant pt-6">
                  <div>
                    <p className="text-[10px] font-headline tracking-normal text-on-surface-variant mb-1">
                      Verified Status
                    </p>
                    <p className="font-headline text-lg tracking-tight text-primary">
                      This certificate is authentic.
                    </p>
                  </div>
                  {certificate?.certificateId ? (
                    <Link
                      className="rounded-xl font-headline text-[10px] tracking-normal text-primary border border-primary px-4 py-3 hover:bg-primary hover:text-on-primary transition-colors"
                      to={`/verify-certificate/${encodeURIComponent(certificate.certificateId)}`}
                    >
                      Open Shareable View
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}

            {result && !result.valid ? (
              <div className="rounded-2xl bg-surface-container-low p-8 border border-outline-variant/60">
                <p className="font-headline text-xs tracking-normal text-outline font-bold mb-3">
                  Not Found
                </p>
                <h2 className="font-headline text-2xl font-black tracking-tight mb-3">
                  Certificate could not be verified
                </h2>
                <p className="text-on-surface-variant">
                  {result.message || 'No matching certificate exists for the provided ID.'}
                </p>
              </div>
            ) : null}

            {!result && !error ? (
              <div className="rounded-2xl bg-surface-container-low p-8 border border-outline-variant/60 text-on-surface-variant">
                Enter a certificate ID to view the verification result and issuance details.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  )
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-surface border border-outline-variant/60 p-4">
      <p className="text-[10px] font-headline tracking-normal text-on-surface-variant mb-2">
        {label}
      </p>
      <p className="font-headline text-sm md:text-base font-bold tracking-wide break-words">
        {value || 'Not available'}
      </p>
    </div>
  )
}

export default CertificateVerificationPage
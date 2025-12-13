import React, { useState } from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';
import { UserProfile } from '../../../types';

interface DeclarationsStepProps {
  data: Partial<UserProfile>;
  onChange: (updates: Partial<UserProfile>) => void;
  errors: Record<string, string>;
  onDisqualify: (reason: string) => void;
}

export const DeclarationsStep: React.FC<DeclarationsStepProps> = ({
  data,
  onChange,
  errors,
  onDisqualify
}) => {
  const [pepSelected, setPepSelected] = useState<boolean | null>(
    data.isPEP !== undefined ? data.isPEP : null
  );
  const [jurisdictionSelected, setJurisdictionSelected] = useState<boolean | null>(
    data.jurisdictionConfirmed !== undefined ? data.jurisdictionConfirmed : null
  );

  const handlePepSelect = (isPEP: boolean) => {
    setPepSelected(isPEP);
    onChange({ isPEP });
  };

  const handleJurisdictionSelect = (inJurisdiction: boolean) => {
    setJurisdictionSelected(inJurisdiction);
    if (inJurisdiction) {
      onChange({ jurisdictionConfirmed: true });
    } else {
      // Disqualify user if outside jurisdiction
      onDisqualify(
        "ClaimCraft UK currently only supports claims within England & Wales jurisdiction. Small Claims Court procedures differ for Scotland and Northern Ireland."
      );
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 font-display">Declarations</h2>
        <p className="text-slate-500 mt-1">Provide your declarations</p>
      </div>

      {/* PEP Question */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-slate-900">
            Are you a Politically Exposed Person or are you in a relationship with a Politically Exposed Person?
          </h3>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            A Politically Exposed Person (PEP) is someone who is or has been entrusted with a prominent public function and is or has been associated with a country, territory, state or international organisation where the exercise of influence or authority may be used to acquire financial or other benefits.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4" role="group" aria-label="Politically Exposed Person selection">
          <button
            type="button"
            onClick={() => handlePepSelect(true)}
            aria-pressed={pepSelected === true}
            aria-label="Yes, I am a Politically Exposed Person"
            className={`
              relative flex items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:ring-offset-2
              ${pepSelected === true
                ? 'border-slate-300 bg-slate-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
              }
            `}
          >
            <div className={`
              w-8 h-8 rounded-lg flex items-center justify-center
              ${pepSelected === true ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-400'}
            `}>
              <Check className="w-5 h-5" aria-hidden="true" />
            </div>
            <span className={`font-semibold ${pepSelected === true ? 'text-slate-700' : 'text-slate-900'}`}>
              Yes
            </span>
          </button>

          <button
            type="button"
            onClick={() => handlePepSelect(false)}
            aria-pressed={pepSelected === false}
            aria-label="No, I am not a Politically Exposed Person"
            className={`
              relative flex items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:ring-offset-2
              ${pepSelected === false
                ? 'border-teal-500 bg-teal-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
              }
            `}
          >
            <div className={`
              w-8 h-8 rounded-lg flex items-center justify-center
              ${pepSelected === false ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-red-400'}
            `}>
              <X className="w-5 h-5" aria-hidden="true" />
            </div>
            <span className={`font-semibold ${pepSelected === false ? 'text-teal-700' : 'text-slate-900'}`}>
              No
            </span>
          </button>
        </div>

        {pepSelected === true && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 animate-fade-in">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-medium">Additional verification may be required</p>
                <p className="text-xs text-amber-600 mt-1">
                  As a PEP, we may need to perform enhanced due diligence. You can still continue with the setup.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Jurisdiction Question */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div>
          <h3 className="font-semibold text-slate-900">
            Is the debtor (defendant) based in England or Wales?
          </h3>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Small Claims Court procedures differ for Scotland and Northern Ireland. We'll check debt age and company status once you enter the claim details.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4" role="group" aria-label="Debtor jurisdiction selection">
          <button
            type="button"
            onClick={() => handleJurisdictionSelect(false)}
            aria-pressed={jurisdictionSelected === false}
            aria-label="No, debtor is not based in England or Wales"
            className={`
              relative flex items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:ring-offset-2
              ${jurisdictionSelected === false
                ? 'border-red-300 bg-red-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
              }
            `}
          >
            <div className={`
              w-8 h-8 rounded-lg flex items-center justify-center
              ${jurisdictionSelected === false ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-red-400'}
            `}>
              <X className="w-5 h-5" aria-hidden="true" />
            </div>
            <span className={`font-semibold ${jurisdictionSelected === false ? 'text-red-700' : 'text-slate-900'}`}>
              No
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleJurisdictionSelect(true)}
            aria-pressed={jurisdictionSelected === true}
            aria-label="Yes, debtor is based in England or Wales"
            className={`
              relative flex items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:ring-offset-2
              ${jurisdictionSelected === true
                ? 'border-teal-500 bg-teal-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
              }
            `}
          >
            <div className={`
              w-8 h-8 rounded-lg flex items-center justify-center
              ${jurisdictionSelected === true ? 'bg-teal-500 text-white' : 'bg-slate-100 text-teal-600'}
            `}>
              <Check className="w-5 h-5" aria-hidden="true" />
            </div>
            <span className={`font-semibold ${jurisdictionSelected === true ? 'text-teal-700' : 'text-slate-900'}`}>
              Yes
            </span>
          </button>
        </div>
        {errors.jurisdictionConfirmed && (
          <p className="text-sm text-red-500" role="alert" aria-live="polite">{errors.jurisdictionConfirmed}</p>
        )}
      </div>
    </div>
  );
};

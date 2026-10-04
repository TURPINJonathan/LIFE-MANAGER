import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  Button,
  ConfirmDialog,
  Dialog,
  EmptyState,
  FormField,
  Icon,
  IconButton,
  SectionCard,
  TpeAmountInput,
} from '@components';
import { BUTTON_VARIANT, FIELD_CONTROL_CLASSES, ICON_BUTTON_VARIANT, PRESET_COLORS } from '@constants';
import {
  ApiError,
  archiveJob,
  archiveWorker,
  createJob,
  createWorker,
  getJob,
  listWorkers,
  suggestContributionRate,
  updateJob,
  updateWorker,
} from '@services';
import { useAuthStore } from '@store';
import type { WorkJob, Worker } from '@app-types';
import { centsToInput, cn, parseEurosToCents, toastFromError, toastInfo, toastSuccess, todayIsoLocal } from '@utils';

import {
  CONTRACT_TYPE_LABELS,
  bpsToPercentInput,
  formatMinutes,
  hoursInputToMinutes,
  minutesToHoursInput,
  percentInputToBps,
} from './work.utils';

type WorkerForm = { displayName: string; notes: string };
type JobForm = {
  title: string;
  companyName: string;
  companySiret: string;
  startDate: string;
  endDate: string;
  notes: string;
  weeklyHours: string;
  contractType: string;
  status: string;
  timeTrackingEnabled: boolean;
  overtimeRatePercent: string;
  contributionPercent: string;
  pasPercent: string;
};

type PendingArchive = { type: 'worker'; id: string; label: string } | { type: 'job'; id: string; label: string };

export function WorkSettingsPanel() {
  const token = useAuthStore((state) => state.token);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workerDialog, setWorkerDialog] = useState<'create' | Worker | null>(null);
  const [jobDialog, setJobDialog] = useState<{ worker: Worker; job?: WorkJob } | null>(null);
  const [hourlyAmount, setHourlyAmount] = useState('');
  const [pendingArchive, setPendingArchive] = useState<PendingArchive | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);

  const workerForm = useForm<WorkerForm>({ defaultValues: { displayName: '', notes: '' } });
  const jobForm = useForm<JobForm>({
    defaultValues: {
      title: '',
      companyName: '',
      companySiret: '',
      startDate: todayIsoLocal(),
      endDate: '',
      notes: '',
      weeklyHours: '35',
      contractType: 'cdi',
      status: 'non_cadre',
      timeTrackingEnabled: true,
      overtimeRatePercent: '125',
      contributionPercent: '22',
      pasPercent: '0',
    },
  });

  const reload = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setWorkers(await listWorkers(token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openJobCreate = (worker: Worker) => {
    setHourlyAmount('');
    jobForm.reset({
      title: '',
      companyName: '',
      companySiret: '',
      startDate: todayIsoLocal(),
      endDate: '',
      notes: '',
      weeklyHours: '35',
      contractType: 'cdi',
      status: 'non_cadre',
      timeTrackingEnabled: true,
      overtimeRatePercent: '125',
      contributionPercent: '22',
      pasPercent: '0',
    });
    setJobDialog({ worker });
  };

  const openJobEdit = async (worker: Worker, jobId: string) => {
    if (!token) return;
    try {
      const job = await getJob(token, jobId);
      setHourlyAmount(centsToInput(job.grossHourlyRateCents));
      jobForm.reset({
        title: job.title,
        companyName: job.companyName,
        companySiret: job.companySiret ?? '',
        startDate: job.startDate,
        endDate: job.endDate ?? '',
        notes: job.notes ?? '',
        weeklyHours: minutesToHoursInput(job.contractWeeklyMinutes),
        contractType: job.contractType,
        status: job.status,
        timeTrackingEnabled: job.timeTrackingEnabled,
        overtimeRatePercent: bpsToPercentInput(job.overtimeRateBps),
        contributionPercent: bpsToPercentInput(job.employeeContributionRateBps),
        pasPercent: bpsToPercentInput(job.pasRateBps),
      });
      setJobDialog({ worker, job });
    } catch (err) {
      toastFromError(err, 'Chargement de l’emploi impossible.');
    }
  };

  const submitWorker = workerForm.handleSubmit(async (values) => {
    if (!token || !workerDialog) return;
    try {
      if (workerDialog === 'create') {
        await createWorker(token, { displayName: values.displayName, notes: values.notes || null });
        toastSuccess('Travailleur créé.');
      } else {
        await updateWorker(token, workerDialog.id, {
          displayName: values.displayName,
          notes: values.notes || null,
        });
        toastSuccess('Travailleur mis à jour.');
      }
      setWorkerDialog(null);
      await reload();
    } catch (err) {
      toastFromError(err, 'Enregistrement impossible.');
    }
  });

  const submitJob = jobForm.handleSubmit(async (values) => {
    if (!token || !jobDialog) return;
    const body = {
      title: values.title,
      companyName: values.companyName,
      companySiret: values.companySiret || null,
      startDate: values.startDate,
      endDate: values.endDate || null,
      notes: values.notes || null,
      contractWeeklyMinutes: hoursInputToMinutes(values.weeklyHours),
      contractType: values.contractType,
      status: values.status,
      timeTrackingEnabled: values.timeTrackingEnabled,
      grossHourlyRateCents: parseEurosToCents(hourlyAmount) ?? 0,
      overtimeRateBps: percentInputToBps(values.overtimeRatePercent),
      employeeContributionRateBps: percentInputToBps(values.contributionPercent),
      pasRateBps: percentInputToBps(values.pasPercent),
      color: PRESET_COLORS[2] ?? '#3F6F5E',
      icon: 'work',
    };
    try {
      if (jobDialog.job) {
        await updateJob(token, jobDialog.job.id, body);
        toastSuccess('Emploi mis à jour.');
      } else {
        await createJob(token, jobDialog.worker.id, body);
        toastSuccess('Emploi créé.');
      }
      setJobDialog(null);
      await reload();
    } catch (err) {
      toastFromError(err, 'Enregistrement impossible.');
    }
  });

  const confirmArchive = async () => {
    if (!token || !pendingArchive) return;
    setArchiveBusy(true);
    try {
      if (pendingArchive.type === 'worker') {
        await archiveWorker(token, pendingArchive.id);
        toastSuccess('Travailleur archivé.');
      } else {
        await archiveJob(token, pendingArchive.id);
        toastSuccess('Emploi archivé.');
      }
      setPendingArchive(null);
      await reload();
    } catch (err) {
      toastFromError(err, 'Archivage impossible.');
    } finally {
      setArchiveBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          fullWidth={false}
          className="h-11 w-auto px-4"
          onClick={() => {
            workerForm.reset({ displayName: '', notes: '' });
            setWorkerDialog('create');
          }}
        >
          <Icon name="person_add" className="text-icon-sm" />
          Travailleur
        </Button>
      </div>

      {error ? (
        <p className="text-control text-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-body text-fg-muted">Chargement…</p>
      ) : workers.length === 0 ? (
        <EmptyState
          icon="work"
          title="Aucun travailleur"
          message="Créez un profil (vous, un conjoint…) puis un emploi / contrat."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {workers.map((worker) => (
            <SectionCard
              key={worker.id}
              title={worker.displayName}
              icon="person"
              headerAction={
                <div className="relative z-10 flex gap-1">
                  <IconButton
                    variant={ICON_BUTTON_VARIANT.ghost}
                    icon="edit"
                    aria-label="Modifier le travailleur"
                    onClick={() => {
                      workerForm.reset({ displayName: worker.displayName, notes: worker.notes ?? '' });
                      setWorkerDialog(worker);
                    }}
                  />
                  <IconButton
                    variant={ICON_BUTTON_VARIANT.danger}
                    icon="delete"
                    aria-label="Archiver le travailleur"
                    onClick={() => setPendingArchive({ type: 'worker', id: worker.id, label: worker.displayName })}
                  />
                </div>
              }
            >
              {worker.notes ? <p className="-mt-1 text-control text-fg-muted">{worker.notes}</p> : null}
              <ul className="divide-y divide-border-subtle border-t border-border-subtle">
                {worker.jobs.length === 0 ? (
                  <li className="py-3 text-body text-fg-muted">Aucun emploi.</li>
                ) : (
                  worker.jobs.map((job) => (
                    <li key={job.id} className="flex items-center gap-3 py-2.5">
                      <span className="flex size-9 items-center justify-center rounded-control bg-accent text-white">
                        <Icon name={job.icon ?? 'work'} className="text-icon-sm" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-medium">{job.title}</span>
                        <span className="block truncate text-control text-fg-muted">
                          {job.companyName} · {CONTRACT_TYPE_LABELS[job.contractType] ?? job.contractType} ·{' '}
                          {formatMinutes(job.contractWeeklyMinutes)}/sem.
                        </span>
                      </span>
                      <div className="flex gap-1">
                        <IconButton
                          variant={ICON_BUTTON_VARIANT.ghost}
                          icon="edit"
                          aria-label="Modifier l’emploi"
                          onClick={() => void openJobEdit(worker, job.id)}
                        />
                        <IconButton
                          variant={ICON_BUTTON_VARIANT.danger}
                          icon="delete"
                          aria-label="Archiver l’emploi"
                          onClick={() => setPendingArchive({ type: 'job', id: job.id, label: job.title })}
                        />
                      </div>
                    </li>
                  ))
                )}
              </ul>
              <Button
                type="button"
                variant={BUTTON_VARIANT.secondary}
                fullWidth={false}
                className="mt-1 w-auto px-3"
                onClick={() => openJobCreate(worker)}
              >
                <Icon name="add" className="text-icon-sm" />
                Emploi
              </Button>
            </SectionCard>
          ))}
        </div>
      )}

      <Dialog
        isOpen={workerDialog !== null}
        onClose={() => setWorkerDialog(null)}
        title={workerDialog === 'create' ? 'Nouveau travailleur' : 'Modifier le travailleur'}
        icon="person"
      >
        <form className="mt-4 flex flex-col gap-4" onSubmit={submitWorker}>
          <FormField label="Nom affiché" htmlFor="set-worker-name">
            <input
              id="set-worker-name"
              className={FIELD_CONTROL_CLASSES}
              {...workerForm.register('displayName', { required: true })}
            />
          </FormField>
          <FormField label="Notes" htmlFor="set-worker-notes" hint="Optionnel">
            <textarea
              id="set-worker-notes"
              rows={2}
              className={FIELD_CONTROL_CLASSES}
              {...workerForm.register('notes')}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant={BUTTON_VARIANT.dangerOutline} onClick={() => setWorkerDialog(null)}>
              Annuler
            </Button>
            <Button type="submit" variant={BUTTON_VARIANT.success}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        isOpen={jobDialog !== null}
        onClose={() => setJobDialog(null)}
        title={jobDialog?.job ? 'Modifier l’emploi' : `Nouvel emploi · ${jobDialog?.worker.displayName ?? ''}`}
        icon="work"
      >
        <form className="mt-4 flex flex-col gap-3" onSubmit={submitJob}>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Poste" htmlFor="sj-title">
              <input
                id="sj-title"
                className={FIELD_CONTROL_CLASSES}
                {...jobForm.register('title', { required: true })}
              />
            </FormField>
            <FormField label="Entreprise" htmlFor="sj-company">
              <input
                id="sj-company"
                className={FIELD_CONTROL_CLASSES}
                {...jobForm.register('companyName', { required: true })}
              />
            </FormField>
            <FormField label="SIRET" htmlFor="sj-siret">
              <input id="sj-siret" className={FIELD_CONTROL_CLASSES} {...jobForm.register('companySiret')} />
            </FormField>
            <FormField label="Temps hebdo (h)" htmlFor="sj-weekly">
              <input id="sj-weekly" className={FIELD_CONTROL_CLASSES} {...jobForm.register('weeklyHours')} />
            </FormField>
            <FormField label="Début" htmlFor="sj-start">
              <input id="sj-start" type="date" className={FIELD_CONTROL_CLASSES} {...jobForm.register('startDate')} />
            </FormField>
            <FormField label="Fin" htmlFor="sj-end">
              <input id="sj-end" type="date" className={FIELD_CONTROL_CLASSES} {...jobForm.register('endDate')} />
            </FormField>
            <FormField label="Contrat" htmlFor="sj-contract">
              <select id="sj-contract" className={FIELD_CONTROL_CLASSES} {...jobForm.register('contractType')}>
                {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Statut" htmlFor="sj-status">
              <select id="sj-status" className={FIELD_CONTROL_CLASSES} {...jobForm.register('status')}>
                <option value="non_cadre">Non-cadre</option>
                <option value="cadre">Cadre</option>
              </select>
            </FormField>
          </div>
          <FormField label="Taux horaire brut" htmlFor="sj-rate">
            <TpeAmountInput
              id="sj-rate"
              value={hourlyAmount}
              onChange={setHourlyAmount}
              className={cn(FIELD_CONTROL_CLASSES, 'font-semibold tabular-nums')}
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Majoration HS (%)" htmlFor="sj-ot">
              <input id="sj-ot" className={FIELD_CONTROL_CLASSES} {...jobForm.register('overtimeRatePercent')} />
            </FormField>
            <FormField label="Cotisations (%)" htmlFor="sj-contrib">
              <input id="sj-contrib" className={FIELD_CONTROL_CLASSES} {...jobForm.register('contributionPercent')} />
            </FormField>
            <FormField label="PAS (%)" htmlFor="sj-pas">
              <input id="sj-pas" className={FIELD_CONTROL_CLASSES} {...jobForm.register('pasPercent')} />
            </FormField>
          </div>
          <label className="flex items-center gap-2 text-control">
            <input type="checkbox" {...jobForm.register('timeTrackingEnabled')} />
            Pointeuse activée
          </label>
          {jobDialog?.job ? (
            <Button
              type="button"
              variant={BUTTON_VARIANT.neutral}
              onClick={() => {
                if (!token || !jobDialog.job) return;
                void suggestContributionRate(token, jobDialog.job.id)
                  .then((s) => {
                    jobForm.setValue('contributionPercent', bpsToPercentInput(s.employeeContributionRateBps));
                    toastInfo(s.note ?? 'Taux suggéré appliqué.');
                  })
                  .catch((err) => toastFromError(err, 'Suggestion impossible.'));
              }}
            >
              Suggérer cotisations
            </Button>
          ) : null}
          <FormField label="Notes" htmlFor="sj-notes">
            <textarea id="sj-notes" rows={2} className={FIELD_CONTROL_CLASSES} {...jobForm.register('notes')} />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant={BUTTON_VARIANT.dangerOutline} onClick={() => setJobDialog(null)}>
              Annuler
            </Button>
            <Button type="submit" variant={BUTTON_VARIANT.success}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        isOpen={pendingArchive !== null}
        onClose={() => setPendingArchive(null)}
        title={pendingArchive?.type === 'worker' ? 'Archiver ce travailleur ?' : 'Archiver cet emploi ?'}
        message={`« ${pendingArchive?.label ?? ''} » disparaîtra de la liste active.`}
        confirmLabel="Archiver"
        busy={archiveBusy}
        onConfirm={() => void confirmArchive()}
      />
    </div>
  );
}

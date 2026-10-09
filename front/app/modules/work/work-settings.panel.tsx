import { useEffect, useMemo, useState } from 'react';
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
import { BUTTON_VARIANT, DIALOG_SIZE, FIELD_CONTROL_CLASSES, ICON_BUTTON_VARIANT, PRESET_COLORS } from '@constants';
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
import type { WeekTemplate, WorkJob, Worker } from '@app-types';
import { centsToInput, cn, parseEurosToCents, toastFromError, toastInfo, toastSuccess, todayIsoLocal } from '@utils';

import { segmentSpanMinutes } from './work-day-dialog.component';
import { defaultWeekTemplate, WeekTemplateDialog } from './week-template-dialog.component';
import {
  CONTRACT_TYPE_LABELS,
  bpsToPercentInput,
  formatMinutes,
  hoursInputToMinutes,
  minutesToHoursInput,
  percentInputToBps,
} from './work.utils';

type WorkerForm = { firstName: string; lastName: string; notes: string };
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

const emptyJobForm = (): JobForm => ({
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

type PendingArchive = { type: 'worker'; id: string; label: string } | { type: 'job'; id: string; label: string };

export function WorkSettingsPanel() {
  const token = useAuthStore((state) => state.token);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workerDialog, setWorkerDialog] = useState<'create' | Worker | null>(null);
  const [jobDialog, setJobDialog] = useState<{ worker: Worker; job?: WorkJob } | null>(null);
  const [hourlyAmount, setHourlyAmount] = useState('');
  const [mutuelleAmount, setMutuelleAmount] = useState('');
  const [prevoyanceAmount, setPrevoyanceAmount] = useState('');
  const [otherDeductionAmount, setOtherDeductionAmount] = useState('');
  const [weekDraft, setWeekDraft] = useState<WeekTemplate>(() => defaultWeekTemplate());
  const [weekDialogOpen, setWeekDialogOpen] = useState(false);
  const [pendingArchive, setPendingArchive] = useState<PendingArchive | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);

  const weekDraftMinutes = useMemo(
    () =>
      weekDraft.reduce((sum, day) => sum + (day.enabled ? segmentSpanMinutes(day.segments, day.pauseMinutes) : 0), 0),
    [weekDraft],
  );

  const workerForm = useForm<WorkerForm>({ defaultValues: { firstName: '', lastName: '', notes: '' } });
  const jobForm = useForm<JobForm>({ defaultValues: emptyJobForm() });

  const resetMoneyFields = (job?: WorkJob) => {
    setHourlyAmount(job ? centsToInput(job.grossHourlyRateCents) : '');
    setMutuelleAmount(job ? centsToInput(job.monthlyMutuelleCents) : '');
    setPrevoyanceAmount(job ? centsToInput(job.monthlyPrevoyanceCents) : '');
    setOtherDeductionAmount(job ? centsToInput(job.monthlyOtherDeductionCents) : '');
  };

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
    resetMoneyFields();
    setWeekDraft(defaultWeekTemplate());
    setWeekDialogOpen(false);
    jobForm.reset(emptyJobForm());
    setJobDialog({ worker });
  };

  const openJobEdit = async (worker: Worker, jobId: string) => {
    if (!token) return;
    try {
      const job = await getJob(token, jobId);
      resetMoneyFields(job);
      setWeekDraft(job.weekTemplate ?? defaultWeekTemplate(job.workDaysMask));
      setWeekDialogOpen(false);
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
        await createWorker(token, {
          firstName: values.firstName,
          lastName: values.lastName,
          notes: values.notes || null,
        });
        toastSuccess('Travailleur créé.');
      } else {
        await updateWorker(token, workerDialog.id, {
          firstName: values.firstName,
          lastName: values.lastName,
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
      monthlyMutuelleCents: parseEurosToCents(mutuelleAmount) ?? 0,
      monthlyPrevoyanceCents: parseEurosToCents(prevoyanceAmount) ?? 0,
      monthlyOtherDeductionCents: parseEurosToCents(otherDeductionAmount) ?? 0,
      weekTemplate: weekDraft,
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
            workerForm.reset({ firstName: '', lastName: '', notes: '' });
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
              title={worker.fullName}
              icon="person"
              headerAction={
                <div className="relative z-10 flex gap-1">
                  <IconButton
                    variant={ICON_BUTTON_VARIANT.ghost}
                    icon="edit"
                    aria-label="Modifier le travailleur"
                    onClick={() => {
                      workerForm.reset({
                        firstName: worker.firstName,
                        lastName: worker.lastName,
                        notes: worker.notes ?? '',
                      });
                      setWorkerDialog(worker);
                    }}
                  />
                  <IconButton
                    variant={ICON_BUTTON_VARIANT.danger}
                    icon="delete"
                    aria-label="Archiver le travailleur"
                    onClick={() => setPendingArchive({ type: 'worker', id: worker.id, label: worker.fullName })}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Prénom" htmlFor="set-worker-first-name">
              <input
                id="set-worker-first-name"
                className={FIELD_CONTROL_CLASSES}
                autoComplete="given-name"
                {...workerForm.register('firstName', { required: true })}
              />
            </FormField>
            <FormField label="Nom" htmlFor="set-worker-last-name">
              <input
                id="set-worker-last-name"
                className={FIELD_CONTROL_CLASSES}
                autoComplete="family-name"
                {...workerForm.register('lastName')}
              />
            </FormField>
          </div>
          <FormField label="Notes" htmlFor="set-worker-notes" hint="Optionnel">
            <textarea
              id="set-worker-notes"
              rows={2}
              className={FIELD_CONTROL_CLASSES}
              {...workerForm.register('notes')}
            />
          </FormField>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant={BUTTON_VARIANT.dangerOutline}
              fullWidth={false}
              className="w-auto px-3"
              onClick={() => setWorkerDialog(null)}
            >
              Annuler
            </Button>
            <Button type="submit" variant={BUTTON_VARIANT.success} fullWidth={false} className="w-auto px-4">
              Enregistrer
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        isOpen={jobDialog !== null}
        onClose={() => {
          setWeekDialogOpen(false);
          setJobDialog(null);
        }}
        title={jobDialog?.job ? 'Modifier l’emploi' : `Nouvel emploi · ${jobDialog?.worker.fullName ?? ''}`}
        icon="work"
        size={DIALOG_SIZE.wide}
      >
        <form className="mt-5 flex flex-col gap-6" onSubmit={submitJob}>
          <section className="flex flex-col gap-3">
            <h3 className="text-control font-semibold uppercase tracking-wide text-fg-muted">Poste</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Intitulé" htmlFor="sj-title">
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
              <FormField label="SIRET" htmlFor="sj-siret" hint="Optionnel">
                <input id="sj-siret" className={FIELD_CONTROL_CLASSES} {...jobForm.register('companySiret')} />
              </FormField>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-control font-semibold uppercase tracking-wide text-fg-muted">Contrat</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Début" htmlFor="sj-start">
                <input id="sj-start" type="date" className={FIELD_CONTROL_CLASSES} {...jobForm.register('startDate')} />
              </FormField>
              <FormField label="Fin" htmlFor="sj-end" hint="Optionnel">
                <input id="sj-end" type="date" className={FIELD_CONTROL_CLASSES} {...jobForm.register('endDate')} />
              </FormField>
              <FormField label="Temps hebdo (h)" htmlFor="sj-weekly">
                <input id="sj-weekly" className={FIELD_CONTROL_CLASSES} {...jobForm.register('weeklyHours')} />
              </FormField>
              <FormField label="Type de contrat" htmlFor="sj-contract">
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
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-control">
                  <input type="checkbox" {...jobForm.register('timeTrackingEnabled')} />
                  Pointeuse activée
                </label>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-control font-semibold uppercase tracking-wide text-fg-muted">Rémunération</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Taux horaire brut" htmlFor="sj-rate">
                <TpeAmountInput
                  id="sj-rate"
                  value={hourlyAmount}
                  onChange={setHourlyAmount}
                  className={cn(FIELD_CONTROL_CLASSES, 'font-semibold tabular-nums')}
                />
              </FormField>
              <FormField label="Majoration HS (%)" htmlFor="sj-ot" hint="125 = +25 %">
                <input id="sj-ot" className={FIELD_CONTROL_CLASSES} {...jobForm.register('overtimeRatePercent')} />
              </FormField>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h3 className="text-control font-semibold uppercase tracking-wide text-fg-muted">Estimation nette</h3>
              {jobDialog?.job ? (
                <Button
                  type="button"
                  variant={BUTTON_VARIANT.neutral}
                  fullWidth={false}
                  className="h-9 w-auto px-3"
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
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Cotisations (%)" htmlFor="sj-contrib" hint="Parts salariales + CSG/CRDS">
                <input id="sj-contrib" className={FIELD_CONTROL_CLASSES} {...jobForm.register('contributionPercent')} />
              </FormField>
              <FormField label="PAS (%)" htmlFor="sj-pas" hint="Prélèvement à la source">
                <input id="sj-pas" className={FIELD_CONTROL_CLASSES} {...jobForm.register('pasPercent')} />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Mutuelle (€ / mois)" htmlFor="sj-mutuelle" hint="Part salariale">
                <TpeAmountInput
                  id="sj-mutuelle"
                  value={mutuelleAmount}
                  onChange={setMutuelleAmount}
                  className={cn(FIELD_CONTROL_CLASSES, 'tabular-nums')}
                />
              </FormField>
              <FormField label="Prévoyance (€ / mois)" htmlFor="sj-prevoyance" hint="Part salariale">
                <TpeAmountInput
                  id="sj-prevoyance"
                  value={prevoyanceAmount}
                  onChange={setPrevoyanceAmount}
                  className={cn(FIELD_CONTROL_CLASSES, 'tabular-nums')}
                />
              </FormField>
              <FormField label="Autres retenues (€ / mois)" htmlFor="sj-other" hint="Tickets resto, etc.">
                <TpeAmountInput
                  id="sj-other"
                  value={otherDeductionAmount}
                  onChange={setOtherDeductionAmount}
                  className={cn(FIELD_CONTROL_CLASSES, 'tabular-nums')}
                />
              </FormField>
            </div>
          </section>

          <section className="rounded-control border border-border-subtle bg-page p-4 dark:bg-elevated">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-body font-medium text-fg-primary">Semaine type</p>
                <p className="text-control text-fg-muted">
                  {formatMinutes(weekDraftMinutes)} / sem. · utilisée pour « Remplir » le planning
                </p>
              </div>
              <Button
                type="button"
                variant={BUTTON_VARIANT.secondary}
                fullWidth={false}
                className="h-10 w-auto shrink-0 px-3"
                onClick={() => setWeekDialogOpen(true)}
              >
                <Icon name="date_range" className="text-icon-sm" />
                Configurer
              </Button>
            </div>
          </section>

          <FormField label="Notes" htmlFor="sj-notes" hint="Optionnel">
            <textarea id="sj-notes" rows={2} className={FIELD_CONTROL_CLASSES} {...jobForm.register('notes')} />
          </FormField>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border-subtle pt-4">
            <Button
              type="button"
              variant={BUTTON_VARIANT.dangerOutline}
              fullWidth={false}
              className="w-auto px-3"
              onClick={() => {
                setWeekDialogOpen(false);
                setJobDialog(null);
              }}
            >
              Annuler
            </Button>
            <Button type="submit" variant={BUTTON_VARIANT.success} fullWidth={false} className="w-auto px-4">
              Enregistrer
            </Button>
          </div>
        </form>
      </Dialog>

      <WeekTemplateDialog
        isOpen={weekDialogOpen}
        onClose={() => setWeekDialogOpen(false)}
        value={weekDraft}
        onChange={setWeekDraft}
        onSave={() => setWeekDialogOpen(false)}
      />

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

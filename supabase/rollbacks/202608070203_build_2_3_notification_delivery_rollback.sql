-- Disable the notification worker without deleting queued/history records.
revoke all on function public.jpac_claim_certificate_email_queue(integer) from public,anon,authenticated,service_role;
revoke all on function public.jpac_complete_certificate_email_delivery(uuid,boolean,text) from public,anon,authenticated,service_role;

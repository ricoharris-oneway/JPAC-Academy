select
  not has_function_privilege('authenticated','public.jpac_claim_certificate_email_queue(integer)','EXECUTE') as users_cannot_claim_notifications,
  not has_function_privilege('anon','public.jpac_complete_certificate_email_delivery(uuid,boolean,text)','EXECUTE') as anon_cannot_complete_notifications,
  has_function_privilege('service_role','public.jpac_claim_certificate_email_queue(integer)','EXECUTE') as worker_can_claim_notifications;

select delivery_status,count(*)
from public.certificate_email_queue
group by delivery_status order by delivery_status;

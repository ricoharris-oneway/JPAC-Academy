-- Build 2.3 / High remediation: service-role certificate notification worker.

create or replace function public.jpac_claim_certificate_email_queue(batch_size integer default 20)
returns setof public.certificate_email_queue
language plpgsql
security definer
set search_path=public
as $$
begin
  return query
  with candidates as (
    select id from public.certificate_email_queue
    where delivery_status in ('pending','retry') and next_attempt_at<=now()
    order by created_at
    limit greatest(1,least(batch_size,100))
    for update skip locked
  )
  update public.certificate_email_queue q
  set delivery_status='processing',attempt_count=q.attempt_count+1,updated_at=now()
  from candidates c where q.id=c.id
  returning q.*;
end;
$$;

create or replace function public.jpac_complete_certificate_email_delivery(
  target_id uuid,
  delivered boolean,
  error_text text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare row_data public.certificate_email_queue%rowtype; delay_minutes integer;
begin
  select * into row_data from public.certificate_email_queue where id=target_id for update;
  if row_data.id is null then raise exception 'Certificate email queue record not found'; end if;
  if delivered then
    update public.certificate_email_queue set delivery_status='sent',sent_at=now(),last_error=null,updated_at=now() where id=target_id;
  else
    delay_minutes:=least(1440,greatest(1,power(2,greatest(0,row_data.attempt_count-1))::integer));
    update public.certificate_email_queue
    set delivery_status=case when attempt_count>=5 then 'failed' else 'retry' end,
        next_attempt_at=now()+make_interval(mins=>delay_minutes),last_error=left(coalesce(error_text,'Delivery failed'),2000),updated_at=now()
    where id=target_id;
  end if;
end;
$$;

revoke all on function public.jpac_claim_certificate_email_queue(integer) from public,anon,authenticated;
revoke all on function public.jpac_complete_certificate_email_delivery(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.jpac_claim_certificate_email_queue(integer) to service_role;
grant execute on function public.jpac_complete_certificate_email_delivery(uuid,boolean,text) to service_role;

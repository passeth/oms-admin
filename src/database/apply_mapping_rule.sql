create or replace function apply_mapping_rule(
  _raw_identifier text,
  _kit_id text
) returns void as $$
begin
  update cm_raw_order_lines
  set matched_kit_id = _kit_id
  where option_text = _raw_identifier
    and (process_status is null or process_status != 'DONE');
end;
$$ language plpgsql;

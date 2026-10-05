// UNIT – SQL building helpers. Guards the "bind parameters only" rule (SQL injection safety).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { containsPattern, WhereBuilder } from './sql.ts';

describe('WhereBuilder', () => {
  it('should produce an empty clause when there are no conditions', () => {
    assert.equal(new WhereBuilder().toSql(), '');
  });

  it('should number placeholders in order and keep values out of the SQL', () => {
    const where = new WhereBuilder()
      .addRaw('f.cancelled IS NOT TRUE')
      .add('f.origin = ?', "JFK' OR 1=1 --")
      .add('f.colyear = ?', 2005);

    assert.equal(
      where.toSql(),
      'WHERE f.cancelled IS NOT TRUE AND f.origin = $1 AND f.colyear = $2',
    );
    assert.deepEqual(where.params, ["JFK' OR 1=1 --", 2005]);
  });

  it('should reuse one placeholder when a fragment mentions the value twice', () => {
    const where = new WhereBuilder().add('(iata ILIKE ? OR airport ILIKE ?)', '%x%');
    assert.equal(where.toSql(), 'WHERE (iata ILIKE $1 OR airport ILIKE $1)');
    assert.equal(where.params.length, 1);
  });

  it('should reserve trailing placeholders for LIMIT/OFFSET', () => {
    const where = new WhereBuilder().add('state = ?', 'TX');
    assert.equal(`LIMIT ${where.next(10)} OFFSET ${where.next(0)}`, 'LIMIT $2 OFFSET $3');
    assert.deepEqual(where.params, ['TX', 10, 0]);
  });
});

describe('containsPattern', () => {
  it('should wrap text in wildcards', () => {
    assert.equal(containsPattern('kennedy'), '%kennedy%');
  });

  it('should escape LIKE metacharacters from user input', () => {
    assert.equal(containsPattern('50%_off\\'), '%50\\%\\_off\\\\%');
  });
});

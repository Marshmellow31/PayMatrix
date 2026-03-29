import Avatar from '../common/Avatar.jsx';

const MemberList = ({ members = [], adminId }) => {
  return (
    <div className="flex flex-col gap-3">
      {members.map((member) => {
        const user = member.user || member;
        const isAdmin = (user._id || user) === adminId;

        return (
          <div
            key={user._id || user}
            className="flex items-center justify-between py-2"
          >
            <div className="flex items-center gap-3">
              <Avatar name={user.name} src={user.avatar} size="sm" />
              <div>
                <p className="text-sm font-medium text-on-surface">
                  {user.name}
                </p>
                <p className="text-xs text-on-surface-variant">{user.email}</p>
              </div>
            </div>
            {isAdmin && (
              <span className="chip text-[10px] uppercase tracking-wider">
                Admin
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MemberList;
